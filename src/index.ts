import { createDebug } from '@substrate-system/debug'
import { type BrowserRtc, getBrowserRTC } from './get-browser-rtc'
const debug = createDebug()

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

export class Peer {
    private _wrtc:BrowserRtc
    private _pc:RTCPeerConnection
    config?:RTCConfiguration

    constructor (opts:Partial<PeerOpts> = {}) {
        debug('constructing', opts)

        const rtc = getBrowserRTC()
        if (!rtc) throw new Error('RTC does not exist')
        this._wrtc = rtc
        this.config = opts.config
        this._pc = new this._wrtc.RTCPeerConnection(
            this.config,
        )
    }

    connect () {
        const channel = this._pc.createDataChannel('abc')
        channel.onopen = (ev) => {
            debug('got "open" event', ev)
            channel.send('Hello')
        }

        channel.onmessage = (ev) => {
            debug('got a message', ev.data)
        }
    }
}
