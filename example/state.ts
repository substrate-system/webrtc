import { signal, type Signal } from '@preact/signals'
import { Party } from './party-client.js'
import { Peer } from '../src/index.js'
import type PartySocket from 'partysocket'
// import Debug from '@substrate-system/debug'
// const debug = Debug()

export const DAY = 86400  // 24 hours in seconds

// https://ephemeral.cx/2014/09/a-dead-simple-webrtc-example/
// An ICE candidate is essentially a description of how to connect to a client.

// const PEER_CONFIG = {
//     iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'stun:stun.services.mozilla.com' },
//         // see https://developers.cloudflare.com/calls/turn/
//         { urls: 'stun:stun.cloudflare.com:3478' },  // STUN over UDP
//         {
//             urls: 'turn:turn.cloudflare.com:3478',
//         },  // TURN over UDP
//         // { urls: 'turn:turn.cloudflare.com:80' },  // TURN over TCP
//         // { urls: 'turn:turn.cloudflare.com:5349' }  // TURN over TLS
//     ]
// }

export const State = function ():{
    status:Signal<'disconnected'|'connected'>;
    connections:Signal<string[]>  // <-- a list of websockets
    party:InstanceType<typeof PartySocket>
    me:Peer;
} {  // eslint-disable-line indent
    const party = Party()
    const me = new Peer({
        party,
        config: PEER_CONFIG
    })

    const state = {
        me,
        connections: signal<string[]>([]),
        party,
        status: signal<'disconnected'|'connected'>('disconnected')
    }

    // @ts-expect-error dev
    window.state = state
    // @ts-expect-error dev
    window.party = party

    me.on('change', ({ connections }) => {
        state.connections.value = connections
    })

    return state
}

export default State
