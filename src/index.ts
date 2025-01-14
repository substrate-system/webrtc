import Debug from '@substrate-system/debug'
import { createNanoEvents } from 'nanoevents'
import { type BrowserRtc, getBrowserRTC } from './get-browser-rtc'
const debug = Debug()

type PeerOpts = {
    config:RTCConfiguration;
    allowHalfOpen:boolean;
    id:string;
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
    sendChannel?:RTCDataChannel  // RTCDataChannel for the local (sender)
    receiveChannel?:RTCDataChannel  // RTCDataChannel for the remote (receiver)
    channel?:RTCDataChannel
    config?:RTCConfiguration

    constructor (opts:Partial<PeerOpts> = {}) {
        const rtc = getBrowserRTC()
        if (!rtc) throw new Error('RTC does not exist')
        this._wrtc = rtc
        this.config = opts.config
        this._pc = new this._wrtc.RTCPeerConnection(this.config)

        this._emitter = createNanoEvents<Events>()
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

    connect () {
        this.channel = this._pc.createDataChannel('abc')
        const channel = this.channel!

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
