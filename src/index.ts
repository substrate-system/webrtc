import { PartySocket } from 'partysocket'
import { createNanoEvents as Nanoevents } from 'nanoevents'
import Debug from '@substrate-system/debug'
const debug = Debug('src')

/**
 * This comes from the websocket only.
 */
interface PeerList {
    type:'info:peerlist';
    peers:string[];
}

interface InfoMessage {
    type:'info',
    peerId:string
}

interface ContentMessage {
    type:'message',
    peerId:string,
    content:string
}

export interface WebRTCEvents {
    peerlist:(peers:string[]) => void;  // when you first connect, a list of peer IDs
    socket:(ws:PartySocket)=>void;  // when websocket connects
    datachannel:(dc:RTCDataChannel)=>void;  // when webRTC is connected
    peer:(arg:[string, RTCDataChannel])=>void;  // when a peer is connected via rtc
    'peer-disconnect':(peerId:string)=>void;  // a peer disconnected
    'webrtc-close':(dc:RTCDataChannel)=>void
    // a message from a peer
    message:(ev:{ data:string, peer:string })=>void|Promise<void>
}

export class Connection {
    polite:boolean = false
    readonly socket:InstanceType<typeof PartySocket>
    private _gotInfo:boolean = false
    private emitter:ReturnType<typeof Nanoevents>
    private pc?:RTCPeerConnection
    private dc?:RTCDataChannel
    private host:string
    private rtcState:{
        isMakingOffer:boolean;
        isSettingRemoteAnswerPending:boolean;
        ignoreOffer:boolean;
    } = {
            isMakingOffer: false,
            isSettingRemoteAnswerPending: false,
            ignoreOffer: false
        }

    peerIdByChannel:Map<RTCDataChannel, string> = new Map<RTCDataChannel, string>()
    connections:string[] = []

    constructor ({ host, room }:{
        host:string;
        room:string;
    }) {
        this.emitter = Nanoevents<WebRTCEvents>()
        this.host = host
        const socket = new PartySocket({ host, room })
        this.socket = socket

        this.listenToSocket()
    }

    private listenToSocket () {
        const socket = this.socket

        socket.addEventListener('open', () => {
            this.emitter.emit('socket', socket)
        })

        /**
         * Listen for peer list info
         */
        const self = this
        socket.addEventListener('message', function onMsg (ev) {
            const msg = parseMsg(ev.data)

            if (msg.type === 'info:peerlist') {
                // polite peer is first one to connect to ws server
                // this only works with 2 machines per ws room
                // eg, if there are many peers, then each one after the first
                // would be impolite, and you can't have 2 impolite peers
                // attempt to connect with each other.
                if (msg.peers.length === 0) {
                    // we are first, so we are polite
                    self.polite = true
                } else {
                    // we are not first, so impoolite
                    self.polite = false
                }

                debug('socket info:peerlist message', msg)

                self.emitter.emit('peerlist', msg.peers)

                // now create the webrtc connection,
                // b/c we know if we are polite or not
                self.webrtc()
            }
        })

        /**
         * Protocol logic
         * Handle the session negotiation.
         */
        socket.addEventListener('message', async ev => {
            const data = JSON.parse(ev.data)
            const { description, candidate } = data

            if (!this.pc) return

            const pc = this.pc
            const rtc = this.rtcState

            // ---- Description handling ----
            if (description) {
                const readyForOffer = (
                    !rtc.isMakingOffer &&
                    (pc.signalingState === 'stable' ||
                        rtc.isSettingRemoteAnswerPending)
                )

                const offerCollision = (
                    description.type === 'offer' &&
                    !readyForOffer
                )

                rtc.ignoreOffer = (!this.polite && offerCollision)
                if (rtc.ignoreOffer) return

                rtc.isSettingRemoteAnswerPending = (description.type === 'answer')

                // Set remote exactly once
                await pc.setRemoteDescription(description)
                rtc.isSettingRemoteAnswerPending = false

                if (description.type === 'offer') {
                    // answer the offer
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    socket.send(JSON.stringify({ description: answer }))
                }
            }

            // ---- Candidate handling ----
            if (candidate) {
                try {
                    await pc.addIceCandidate(candidate)
                } catch (err) {
                    if (!rtc.ignoreOffer) throw err
                }
            }
        })
    }

    // close the webrtc data channel and socket
    close () {
        this.socket.close()
        this.dc?.close()
    }

    // close the webrtc channel
    peerDisconnect () {
        this.dc?.close()
    }

    // connect to webrtc
    private async webrtc () {
        // fetch the ICE servers
        const iceServers:{
            urls:string[];
            credential?:string,
            username?:string;
        }[] = []

        // The Partykit server should have env variables to authenticate
        // with Cloudflare.
        //
        // Could add some client authentication here (eg a password).
        //
        // see https://docs.partykit.io/guides/responding-to-http-requests/
        const url = `${this.host}/parties/main/${this.socket.room}/turn`
        const res = await fetch(url)
        if (res.ok) {
            const data = await res.json()
            if (data.iceServers && data.iceServers.length > 0) {
                iceServers.push(...data.iceServers)
            }
        }

        // our peer connection
        const pc = new RTCPeerConnection({ iceServers })
        this.pc = pc

        /**
         * This event, 'negotiationneeded', happens on caller side only.
         *
         * @SEE {@link https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#handling_the_negotiationneeded_event | MDN docs}
         */
        pc.addEventListener('negotiationneeded', async () => {
            // If we are already making an offer, bail out immediately.
            if (this.rtcState.isMakingOffer) return

            /**
             * > setLocalDescription() without arguments automatically
             * > creates and sets the appropriate description based on the
             * > current signalingState.
             */

            try {
                // set makingOffer immediately before calling
                // setLocalDescription() in order to lock against
                // interfering with sending this offer,
                // and we don't clear it back to false until the offer has
                // been sent to the signaling server
                this.rtcState.isMakingOffer = true

                // 1. Create the offer explicitly
                const offer = await pc.createOffer()

                // 2. Set the local description explicitly
                await pc.setLocalDescription(offer)

                this.socket.send(JSON.stringify({
                    type: pc.localDescription?.type,
                    description: pc.localDescription
                }))
            } catch (err) {
                console.error(err)
            } finally {
                this.rtcState.isMakingOffer = false
            }
        })

        /**
         * Take the candidate member of this ICE event and pass it
         * through to the signaling channel's send() method to be sent over
         * the signaling server to the remote peer.
         *
         * @SEE {@link https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#handling_incoming_ice_candidates | MDN docs}
         */
        pc.addEventListener('icecandidate', ev => {
            this.socket.send(JSON.stringify({
                candidate: ev.candidate
            }))
        })

        pc.addEventListener('datachannel', ev => {
            // this happens on the "callee" side
            // for the caller, we get the dc in the 'connectToPeer' function
            this.listenToDataChannel(ev.channel)
        })
    }

    private listenToDataChannel (dc:RTCDataChannel) {
        dc.addEventListener('open', () => {
            this.emitter.emit('datachannel', dc)
            this.dc = dc
            dc.send(JSON.stringify({
                type: 'info',
                peerId: this.socket.id
            }))
        }, { once: true })

        dc.addEventListener('close', () => {
            debug('dc close')
            this._gotInfo = false
            const peerId = this.peerIdByChannel.get(dc)
            this.connections = this.connections.filter(c => c !== peerId)
            this.emitter.emit('peer-disconnect', peerId)
        }, { once: true })

        /**
         * The new peer sends us their peer ID as the first message.
         */
        dc.addEventListener('message', ev => {
            if (this._gotInfo) {
                return this.emitter.emit('message', {
                    data: ev.data,
                    peer: this.peerIdByChannel.get(dc)
                })
            }

            let data
            try {
                data = parseMsg(ev.data)
            } catch (_err) {
                // not JSON
                // assume this is app-specific encoding
                return this.emitter.emit('message', {
                    peer: this.peerIdByChannel.get(dc),
                    data: ev.data
                })
            }

            /**
             * Listen for the new peer's ID.
             */
            if (data.type === 'info') {
                this._gotInfo = true
                const info:InfoMessage = data

                this.connections = Array.from(new Set([
                    ...this.connections,
                    info.peerId
                ]))

                this.peerIdByChannel.set(dc, info.peerId)
                return this.emitter.emit('peer', [info.peerId, dc])
            }

            this.emitter.emit('message', data)
        })
    }

    /**
     * In here, do the RTC negotiation.
     * We assign the first peer to connect to the ws the **polite** role.
     */
    async connectToPeer (peerId:string, channelName?:string):Promise<void> {
        // send initial offer,
        // or respond to offer
        if (!this.pc || !this.socket) return
        const pc = this.pc

        // this triggers negotiation
        const dc = pc.createDataChannel(channelName || 'chat')
        this.dc = dc

        // this emits the 'webrtc' event
        this.listenToDataChannel(dc)

        const self = this
        dc.addEventListener('open', function onOpen () {
            // send our peerId to the other side
            self.connections = [...self.connections, peerId]

            // dc.send(JSON.stringify({
            //     type: 'info',
            //     peerId: self.socket.id
            // }))
        }, { once: true })

        this.peerIdByChannel.set(dc, peerId)
    }

    // events
    on<K extends keyof WebRTCEvents> (
        event:K,
        callback:WebRTCEvents[K]
    ):()=>void {
        return this.emitter.on(event, callback)
    }

    once<K extends keyof WebRTCEvents> (ev:K, cb:WebRTCEvents[K]) {
        const off = this.emitter.on(ev, data => {
            cb(data)
            off()
        })
    }

    send (msg:string|Blob|ArrayBuffer|ArrayBufferView<ArrayBuffer>) {
        if (!this.dc) throw new Error('Not this.dc')
        this.dc!.send(msg as any)
    }
}

/**
 * Return a new Connection instance. This promise resolves when the websocket
 * is connected. After that, you need to call `connectToPeer` on the Connection.
 *
 * @returns {Promise<Connection>} A promise that resolves when the
 *                                socket connects.
 */
export function connect ({
    host,
    room
}:{ host:string; room:string; }):Promise<Connection> {
    const connection = new Connection({ host, room })

    return new Promise<Connection>(resolve => {
        connection.on('socket', () => resolve(connection))
    })
}

/**
 * This handles both ws and webrtc messages.
 */
function parseMsg (data:string):InfoMessage|ContentMessage|PeerList {
    const msg:InfoMessage|ContentMessage|PeerList = JSON.parse(data)
    return msg
}
