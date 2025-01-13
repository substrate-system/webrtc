// import adapter from 'webrtc-adapter'
import 'webrtc-adapter'

export type BrowserRtc = {
    RTCPeerConnection:typeof RTCPeerConnection;
    RTCSessionDescription:typeof RTCSessionDescription;
    RTCIceCandidate:typeof RTCIceCandidate;
}

/**
 * Deal with vendor prefixes.
 */
export function getBrowserRTC ():BrowserRtc|null {
    if (typeof globalThis === 'undefined') return null

    const wrtc = {
        RTCPeerConnection: (
            globalThis.RTCPeerConnection ||
            globalThis.mozRTCPeerConnection ||
            globalThis.webkitRTCPeerConnection
        ),
        RTCSessionDescription: (
            globalThis.RTCSessionDescription ||
            globalThis.mozRTCSessionDescription ||
            globalThis.webkitRTCSessionDescription
        ),
        RTCIceCandidate: (
            globalThis.RTCIceCandidate ||
            globalThis.mozRTCIceCandidate ||
            globalThis.webkitRTCIceCandidate
        )
    }

    if (!wrtc.RTCPeerConnection) return null

    return wrtc
}
