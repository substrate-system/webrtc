import Debug from '@substrate-system/debug'
import { createNanoEvents } from 'nanoevents'
import { type BrowserRtc, getBrowserRTC } from './get-browser-rtc'
import type PartySocket from 'partysocket'
export { type BrowserRtc } from './get-browser-rtc.js'
const debug = Debug()

export type SignalMessage = ({
    description:RTCSessionDescriptionInit
    target?:string
})|(RTCIceCandidateInit & { target?:string });

export type ConnectionState = {
    connections: string[]  // a list of connection IDs
}

type PeerOpts = {
    config:RTCConfiguration;
    allowHalfOpen:boolean;
    id:string;
    party:InstanceType<typeof PartySocket>;
    channelName:string;
    initiator:boolean;
    channelConfig:any;
    channelNegotiated;
    offerOptions:any;
    answerOptions:any;
    sdpTransform:((arg)=>typeof arg)
}

// const config: RTCConfiguration = {
//     iceServers: [
//         {
//             urls: 'stun:stun.l.google.com:19302'
//         }
//     ],
//     iceTransportPolicy: 'all',
//     bundlePolicy: 'balanced',
//     rtcpMuxPolicy: 'require'
// };

interface PeerEvents {
    connect:()=>void;
    open:()=>void;
    close:()=>void;
    change:(ev:{ connections:string[] })=>void;
}

export class Peer {
    private _wrtc:BrowserRtc
    private _pc:RTCPeerConnection
    private _emitter:ReturnType<typeof createNanoEvents<PeerEvents>>
    private _party:InstanceType<typeof PartySocket>
    _connections:string[]|null
    makingOffer:boolean
    sendChannel?:RTCDataChannel  // RTCDataChannel for the local (sender)
    receiveChannel?:RTCDataChannel  // RTCDataChannel for the remote (receiver)
    channel?:RTCDataChannel
    config?:RTCConfiguration
    polite:boolean|null  // polite peer is the first to connect to signaling server

    constructor (opts:PartialExcept<PeerOpts, 'party'>) {
        const rtc = getBrowserRTC()
        if (!rtc) throw new Error('RTC does not exist')
        this.makingOffer = false
        this._wrtc = rtc
        this._connections = null
        this.config = opts.config
        this._pc = new this._wrtc.RTCPeerConnection(this.config)
        this._emitter = createNanoEvents<PeerEvents>()
        this.polite = null  // first peer to connect is polite
        this._party = opts.party

        const self = this

        /**
         * Handle 'connections' type messages
         * We use this to determine politeness
         */
        this._party.addEventListener('message', function handleConnections (ev) {
            let msg:ConnectionState
            try {
                msg = JSON.parse(ev.data)
            } catch (err) {
                debug('not json!', ev.data)
                return console.error(err)
            }

            const connections = msg.connections
            if (!connections) return  // only listen to connections type

            debug('got a connection message:::::', connections)
            if ((connections.length > 1) && self.polite === null) {
                // polite peer is 1st to connect
                self.polite = false
            } else {
                self.polite = true
            }

            self._connections = connections
            self._emitter.emit('change', { connections })
        })
    }

    on<E extends keyof PeerEvents> (ev:E, cb:PeerEvents[E]) {
        return this._emitter.on(ev, cb)
    }

    handleSendChannelStatusChange (ev) {
        if (!this.channel) return  // for TS
        const channel = this.channel
        const state = channel.readyState

        if (state === 'open') {
            debug('its open!', ev)
            this._emitter.emit('open')
        } else {
            debug('closed!', ev)
            this._emitter.emit('close')
        }
    }

    /**
     * When you first connect to the websocket, it will give you a list
     * of all the other peers in the room.
     *
     * If the list is empty except for you, then you are the first to connect.
     */

    async connect ():Promise<void> {
        const party = this._party
        const channel = this.channel = this._pc.createDataChannel('abc')

        if (this._connections === null) {
            // should not happen
            //
            // This is called in response to a button click;
            // we should get the initial websocket message when the page loads,
            // so this._connections will be an array, either empty or not.
            throw new Error('null connections')
        }

        const conns = this._connections
        const otherConnectionId = conns.find(c => c !== this._party.id)

        debug('the other id...', otherConnectionId)

        const pc = this._pc
        pc.onnegotiationneeded = async () => {
            try {
                // avoid race coditions by using this instead of signaling state
                this.makingOffer = true

                // @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#the_perfect_negotiation_logic
                //
                // Note that setLocalDescription() without arguments
                // automatically creates and sets the appropriate description
                // based on the current signalingState.
                //
                // The description is either an answer to the most recent
                // offer from the remote peer, or a freshly-created offer if
                // there's no negotiation underway.
                //
                // the `negotiationneeded` event is only fired in `stable` state,
                // so here it will always be an offer
                await pc.setLocalDescription()

                const msg:SignalMessage = {
                    target: otherConnectionId,
                    description: pc.localDescription!
                }
                party.send(JSON.stringify(msg))
            } catch (err) {
                debug('error in onnegotiationneeded')
                console.error(err)
            } finally {
                this.makingOffer = false
            }
        }

        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#using_restartice
         */
        pc.oniceconnectionstatechange = () => {
            debug('ice connection state change', pc.iceConnectionState)

            if (pc.iceConnectionState === 'failed') {
                // `restartIce()` tells the ICE layer to automatically add the
                // `iceRestart` flag to the next ICE message sent.
                pc.restartIce()
            }
        }

        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#handling_incoming_ice_candidates
         *
         * How the local ICE layer passes candidates to us for delivery to the
         * remote peer over the signaling channel.
         */
        let n = 0
        pc.onicecandidate = (ev:RTCPeerConnectionIceEvent) => {
            n++
            const { candidate } = ev
            debug('got ice candidate', candidate, n)

            if (!candidate) {
                return debug('not candidate!!!!!', ev)
            }

            const msg:SignalMessage = {
                target: otherConnectionId,
                candidate: candidate.candidate
            }

            debug('sending this message', msg)

            party.send(JSON.stringify(msg))
        }

        /**
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#handling_incoming_messages_on_the_signaling_channel MDN docs}
         *
         * > If the incoming message has a `description`, it's either an offer
         * > or an answer sent by the other peer.
         *
         * > If, on the other hand, the message has a candidate, it's an ICE
         * > candidate received from the remote peer as part of trickle ICE.
         * > The candidate is destined to be delivered to the local ICE layer
         * > by passing it into addIceCandidate().
         */
        let ignoreOffer:boolean = false
        party.addEventListener('message', async ev => {
            debug('______got a message method______', ev.data)

            try {
                const msg:SignalMessage = JSON.parse(ev.data)
                if (!('description' in msg) || !('candidate' in msg)) return

                /**
                 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#on_receiving_a_description
                 * "on reveiving a description"
                 */

                /**
                 * _On receiving a description_
                 * Prepare to respond to the incoming offer or answer.
                 */

                if (msg.description) {
                    // 1.
                    // check to make sure we're in a state in which we can
                    // accept an offer
                    const offerCollision = (
                        msg.description.type === 'offer' &&
                        (this.makingOffer || pc.signalingState !== 'stable')
                    )

                    ignoreOffer = !this.polite && offerCollision

                    // If we're the impolite peer, and we're receiving a
                    // colliding offer, we return without setting the
                    // description, and set `ignoreOffer` to true.
                    if (ignoreOffer) {
                        return
                    }

                    // If we're the polite peer, and we're receiving a
                    // colliding offer, we don't need to do anything special,
                    // because our existing offer will automatically be rolled
                    // back in the next step.

                    // Having ensured that we want to accept the offer, we set
                    // the remote description to the incoming offer by calling
                    // `setRemoteDescription()`.
                    //
                    // This lets WebRTC know what the proposed configuration of
                    // the other peer is. If we're the polite peer, we will drop
                    // our offer and accept the new one.
                    await pc.setRemoteDescription(msg.description)

                    // If the newly-set remote description is an offer
                    if (msg.description.type === 'offer') {
                        // we ask WebRTC to select an appropriate local
                        // configuration by calling the  method
                        // `setLocalDescription()` without parameters.
                        // This causes setLocalDescription() to automatically
                        // generate an appropriate answer in response to the
                        // received offer.
                        await pc.setLocalDescription()
                        const msg:SignalMessage = {  // this msg is an answer
                            description: pc.localDescription!
                        }
                        party.send(JSON.stringify(msg))
                    }

                /**
                 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#on_receiving_an_ice_candidate
                 * _On receiving an ICE candidate_
                 *
                 * If the received message contains an ICE candidate, we deliver
                 * it to the local ICE layer by calling the
                 * method `addIceCandidate()`.
                 */
                } else if (msg.candidate) {
                    try {
                        await pc.addIceCandidate(msg.candidate)
                    } catch (err) {
                        if (!ignoreOffer) {
                            throw err
                        }
                    }
                }
            } catch (err) {
                debug(':sad-trombone:')
                console.error(err)
            }
        })

        channel.onopen = (ev) => {
            debug('got "open" event', ev)
            this.handleSendChannelStatusChange(ev)
            channel.send('Hello')
        }

        channel.onmessage = (ev) => {
            debug('got a message in the channel', ev.data)
        }

        channel.onclose = ev => {
            debug('channel closed', ev)
            this.handleSendChannelStatusChange(ev)
        }

        debug('the channel', channel)
    }

    // // called by the first peer to join
    // listen () {
    //     this._pc.ondatachannel = (ev:RTCDataChannelEvent) => {
    //         const receiveChannel = ev.channel
    //         receiveChannel.onmessage = ev => {
    //             debug('got a message in listener', ev)
    //         }

    //         receiveChannel.onopen = ev => {
    //             debug('channel opened...', ev)
    //         }

    //         receiveChannel.onclose = (ev) => {
    //             debug('channel closed...', ev)
    //         }
    //     }
    // }
}
