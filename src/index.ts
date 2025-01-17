import Debug from '@substrate-system/debug'
import { createNanoEvents } from 'nanoevents'
import { type BrowserRtc, getBrowserRTC } from './get-browser-rtc'
import type PartySocket from 'partysocket'
export { type BrowserRtc } from './get-browser-rtc.js'
const debug = Debug()

export type SignalMessage = ({
    description:RTCSessionDescriptionInit
    target?:string
})|({
    candidate:RTCIceCandidateInit;
    target?:string
});

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
    private _pc?:RTCPeerConnection
    private _emitter:ReturnType<typeof createNanoEvents<PeerEvents>>
    private _party:InstanceType<typeof PartySocket>
    private _listening:boolean
    _connections:string[]|null  // a list of other websocket peer IDs
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
        // this._pc = new this._wrtc.RTCPeerConnection(this.config)
        this._emitter = createNanoEvents<PeerEvents>()
        this.polite = null  // first peer to connect is polite
        this._party = opts.party
        this._listening = false

        const self = this

        /**
         * Handle 'connections' type messages
         * We use this to determine politeness
         * 1st user is "polite", 2nd "impolite"
         */
        this._party.addEventListener('message', (ev) => {
            let msg:ConnectionState
            try {
                msg = JSON.parse(ev.data)
            } catch (err) {
                debug('not json!', ev.data)
                return console.error(err)
            }
            debug('got a message in src file', msg)

            const connections = msg.connections
            debug(':::::got a connection message:::::', connections)
            if (!connections) return  // only listen for connections messages

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

    handleSendChannelStatusChange () {
        if (!this.channel) return  // for TS
        const channel = this.channel
        const state = channel.readyState

        if (state === 'open') {
            debug('its open!', state)
            this._emitter.emit('open')
        } else {
            debug('closed!', state)
            this._emitter.emit('close')
        }
    }

    connect (config?:RTCConfiguration):void {
        debug('connect called')
        if (config) this.config = config
        this._pc = new this._wrtc.RTCPeerConnection(this.config)
        const channel = this.channel = this._pc.createDataChannel('abc')

        channel.onopen = () => {
            this.handleSendChannelStatusChange()
            channel.send('Hello')
        }

        channel.onmessage = (ev) => {
            debug('got a message in the channel', ev.data)
        }

        channel.onclose = () => {
            this.handleSendChannelStatusChange()
        }

        if (!this._listening) this._listen()
    }

    /**
     * internal method
     * listen for all the pc events
     */
    private _listen () {
        this._listening = true
        const pc = this._pc!
        const party = this._party

        pc.ondatachannel = (ev:RTCDataChannelEvent) => {
            debug('______ on data channel ______')
            const channel = ev.channel
            channel.onmessage = ev => {
                debug('got a message on receive channel', ev.data)
            }

            channel.onopen = ev => {
                debug('channel opened...', ev)
            }

            channel.onclose = (ev) => {
                debug('channel closed...', ev)
            }
        }

        pc.onnegotiationneeded = async () => {
            debug('_______________on negotiation needed_______________')

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
                    target: this._connections?.find(c => c !== this._party.id),
                    description: pc.localDescription!
                }
                debug('sending this.....negotiation needed...', msg)
                party.send(JSON.stringify(msg))
            } catch (err) {
                console.error(err)
            } finally {
                this.makingOffer = false
            }
        }

        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#handling_incoming_ice_candidates
         *
         * How the local ICE layer passes candidates to us for delivery to the
         * remote peer over the signaling channel.
         */
        pc.onicecandidate = (ev:RTCPeerConnectionIceEvent) => {
            const { candidate } = ev

            if (!candidate) return

            const msg:SignalMessage = {
                target: this._connections?.find(c => c !== this._party.id),
                candidate
            }

            debug('sending this......ice candidate........', msg)
            party.send(JSON.stringify(msg))
        }

        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#using_restartice
         */
        pc.oniceconnectionstatechange = () => {
            debug(
                '________ice connection state change__________',
                pc.iceConnectionState
            )

            if (pc.iceConnectionState === 'failed') {
                // `restartIce()` tells the ICE layer to automatically add the
                // `iceRestart` flag to the next ICE message sent.
                pc.restartIce()
            }
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
            try {
                const msg:SignalMessage = JSON.parse(ev.data)
                if (!(msg as any).connections) {  // filter connection updates
                    debug('____the parsed message____', msg)
                }

                if (!(('description' in msg) || ('candidate' in msg))) return

                debug('still going................', msg)

                /**
                 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#on_receiving_a_description
                 * "on reveiving a description"
                 */

                /**
                 * _On receiving a description_
                 * Prepare to respond to the incoming offer or answer.
                 */

                if ('description' in msg) {
                    // 1.
                    // check to make sure we're in a state in which we can
                    // accept an offer
                    const offerCollision = (
                        msg.description.type === 'offer' &&
                        (this.makingOffer || pc.signalingState !== 'stable')
                    )

                    // debug('___the msg stuff___')
                    // debug('collision???', offerCollision)
                    // debug('type', msg.description.type)
                    // debug('this.makingOffer', this.makingOffer)
                    // debug('pc signaling state', pc.signalingState)

                    debug('collision????????????????????????????', offerCollision)

                    ignoreOffer = !this.polite && offerCollision

                    // If we're the impolite peer, and we're receiving a
                    // colliding offer, we return without setting the
                    // description, and set `ignoreOffer` to true.
                    debug('ignoring the message???????????????', ignoreOffer)
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

                    debug('done setting remote description', msg)

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
                            target: this._connections?.find(c => {
                                return c !== this._party.id
                            }),
                            description: pc.localDescription!
                        }

                        debug(
                            'sending this message with our local description...',
                            msg
                        )
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
    }
}
