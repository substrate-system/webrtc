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

export const State = function ():{
    status:Signal<'disconnected'|'connected'>;
    connections:Signal<string[]>;  // <-- a list of websockets
    party:InstanceType<typeof PartySocket>;
    config:Signal<RTCConfiguration|null>;
    me:Peer;
} {  // eslint-disable-line indent
    const party = Party()

    // party.addEventListener('message', msg => {
    //     debug('got a message')
    //     console.log(JSON.parse(msg.data))
    // })

    // need to await a ky call to get config
    const me = new Peer({
        party,
    })

    const state = {
        me,
        config: signal<RTCConfiguration|null>(null),
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

State.getIceData = async function (
    state:ReturnType<typeof State>
):Promise<void> {
    const config = await ky.post('/api/turn').json<RTCConfiguration>()
    debug('the config...', config)
    state.config.value = {
        ...config,
        iceServers: [
            // @ts-expect-error ??? is the API returning an old format?
            config.iceServers
        ]
    }
}

export default State
