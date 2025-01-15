import Debug from '@substrate-system/debug'
import { createNanoEvents } from 'nanoevents'
import { type BrowserRtc, getBrowserRTC } from './get-browser-rtc'
import type PartySocket from 'partysocket'
export { type BrowserRtc } from './get-browser-rtc.js'
const debug = Debug()

export type SignalMessage = {
    type:'offer'|'answer',
    target?:string,
}|{
    type:'icecandidate';
    candidate:RTCIceCandidate|null;
    target?:string;
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

interface Events {
    connect:()=>void;
    open:()=>void;
    close:()=>void;
}

export class Peer {
    private _wrtc:BrowserRtc
    private _pc:RTCPeerConnection
    private _emitter:ReturnType<typeof createNanoEvents<Events>>
    private _party:InstanceType<typeof PartySocket>
    makingOffer:boolean = false
    sendChannel?:RTCDataChannel  // RTCDataChannel for the local (sender)
    receiveChannel?:RTCDataChannel  // RTCDataChannel for the remote (receiver)
    channel?:RTCDataChannel
    config?:RTCConfiguration

    constructor (opts:PartialExcept<PeerOpts, 'party'>) {
        const rtc = getBrowserRTC()
        if (!rtc) throw new Error('RTC does not exist')
        this._wrtc = rtc
        this.config = opts.config
        this._pc = new this._wrtc.RTCPeerConnection(this.config)
        this._emitter = createNanoEvents<Events>()
        this._party = opts.party
    }

    on<E extends keyof Events> (ev:E, cb:Events[E]) {
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
     * When you first connect to the websocket, it will send you a list
     * of all the other peers in the room. If you are the second to connect,
     * then you call `connect`, b/c you know the other user's ID. If you are
     * first, then you should call `listen`.
     */

    /**
     * this is called by the one initiating the connection
     * (the second one to connect)
     */
    async connect (
        otherConnectionId?:string
    ):Promise<void> {
        const party = this._party
        const channel = this.channel = this._pc.createDataChannel('abc')

        // candidate message
        // data: { description, candidate }

        const pc = this._pc
        pc.onnegotiationneeded = async () => {
            try {
                this.makingOffer = true
                // @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#the_perfect_negotiation_logic
                //
                // Note that setLocalDescription() without arguments
                // automatically creates and sets the appropriate description
                // based on the current signalingState.
                await pc.setLocalDescription()
                party.send(JSON.stringify({
                    type: 'offer',
                    target: otherConnectionId,
                    description: pc.localDescription
                }))
            } catch (err) {
                console.error(err)
            } finally {
                this.makingOffer = false
            }
        }

        pc.onicecandidate = (ev) => {
            const { candidate } = ev
            debug('got ice candidate', candidate)

            const msg:SignalMessage = {
                type: 'icecandidate',
                target: otherConnectionId,
                candidate
            }

            party.send(JSON.stringify(msg))
        }

        party.addEventListener('message', async ev => {
            try {
                const msg:{ description, candidate } = JSON.parse(ev.data)
                if (!msg.description || !msg.candidate) return
                await pc.setRemoteDescription(msg.description)
            } catch (err) {
                console.log('not json')
                console.error(err)
            }
        })

        channel.onopen = (ev) => {
            debug('got "open" event', ev)
            this.handleSendChannelStatusChange(ev)
            channel.send('Hello')
        }

        channel.onmessage = (ev) => {
            debug('got a message', ev.data)
        }

        channel.onclose = ev => {
            debug('channel closed', ev)
            this.handleSendChannelStatusChange(ev)
        }

        debug('the channel', channel)
    }

    // called by the first peer to join
    listen () {
        this._pc.ondatachannel = (ev:RTCDataChannelEvent) => {
            const receiveChannel = ev.channel
            receiveChannel.onmessage = ev => {
                debug('got a message in listener', ev)
            }

            receiveChannel.onopen = ev => {
                debug('channel opened...', ev)
            }

            receiveChannel.onclose = (ev) => {
                debug('channel closed...', ev)
            }
        }
    }
}
