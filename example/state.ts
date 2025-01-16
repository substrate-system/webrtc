import { signal, type Signal } from '@preact/signals'
import { Party } from './party-client.js'
import { Peer } from '../src/index.js'
import type PartySocket from 'partysocket'
import Debug from '@substrate-system/debug'
const debug = Debug()

// https://ephemeral.cx/2014/09/a-dead-simple-webrtc-example/
// An ICE candidate is essentially a description of how to connect to a client.

const PEER_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]
}

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
    // let pingInterval:ReturnType<typeof setInterval>

    const state = {
        me,
        connections: signal<string[]>([]),
        party,
        status: signal<'disconnected'|'connected'>('disconnected')
    }

    me.on('change', ({ connections }) => {
        debug('change', connections)
        state.connections.value = connections
    })

    // @ts-expect-error dev
    window.party = party

    // party.addEventListener('message', function handleConnections (ev) {
    //     try {
    //         const msg = JSON.parse(ev.data)
    //         if (msg.connections.length) {
    //             // we are second
    //             state.first.value = false
    //         } else {
    //             state.first.value = true
    //         }

    //         // we get the list of peers as the first message
    //         // party.removeEventListener('message', handleConnections)
    //     } catch (err) {
    //         console.error('not json...', err)
    //     }
    // })

    // party.addEventListener('message', (ev) => {
    //     debug(`Received -> ${ev.data}`)
    // })

    return state
}

export default State
