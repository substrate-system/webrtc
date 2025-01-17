import { signal, type Signal } from '@preact/signals'
import { Party } from './party-client.js'
import { Peer } from '../src/index.js'
import type PartySocket from 'partysocket'
import ky from 'ky'
import Debug from '@substrate-system/debug'
const debug = Debug()

// https://ephemeral.cx/2014/09/a-dead-simple-webrtc-example/
// An ICE candidate is essentially a description of how to connect to a client.

// const PEER_CONFIG = {
//     iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'stun:stun.services.mozilla.com' },
//     ]
// }

export const State = async function ():Promise<{
    status:Signal<'disconnected'|'connected'>;
    connections:Signal<string[]>  // <-- a list of websockets
    party:InstanceType<typeof PartySocket>
    me:Peer;
}> {  // eslint-disable-line indent
    const party = Party()

    const config = await ky.post('/api/turn').json<RTCConfiguration>()

    debug('the config...', config)

    // const PEER_CONFIG = {
    //     iceServers: [
    //         { urls: 'stun:stun.l.google.com:19302' },
    //         { urls: 'stun:stun.services.mozilla.com' },
    //     ]
    // }

    // {
    //     "urls": [
    //         "stun:stun.cloudflare.com:3478",
    //         "turn:turn.cloudflare.com:3478?transport=udp",
    //         "turn:turn.cloudflare.com:3478?transport=tcp",
    //         "turns:turn.cloudflare.com:5349?transport=tcp"
    //     ],
    //     "username": "g0a9b0c9188d8eb9c560a21c9cdc3e278949f7727c1ba24fe78dee252f1cf858",
    //     "credential": "a3cc5d1165e191dbecfc20f29fc06b6913653481a58434d9c1494876b16c5cec"
    // }

    // need to await a ky call to get config
    const me = new Peer({
        party,
        config: {
            iceServers: [
                // @ts-expect-error ??? is the API returning an old format?
                config.iceServers
            ]
        }
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
