import { signal, type Signal } from '@preact/signals'
import { Party } from './party-client.js'
import { Peer } from '../src/index.js'
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
    peerIds:Signal<string[]>;  // <-- this is other WS connections
    first:Signal<boolean|null>;
    me:Peer;
} {  // eslint-disable-line indent
    const me = new Peer({
        config: PEER_CONFIG
    })
    const party = Party()
    let pingInterval:ReturnType<typeof setInterval>

    const state = {
        me,
        first: signal<boolean|null>(null),
        peerIds: signal([]),
        status: signal<'disconnected'|'connected'>('disconnected')
    }

    // @ts-expect-error dev
    window.party = party

    party.addEventListener('message', function handleConnections (ev) {
        try {
            const msg = JSON.parse(ev.data)
            if (msg.connections.length) {
                // we are second
                state.first.value = false
            } else {
                state.first.value = true
            }
        } catch (err) {
            console.error('not json...', err)
        }
    })

    party.addEventListener('message', (ev) => {
        debug(`Received -> ${ev.data}`)
    })

    // Let's listen for when the connection opens
    // And send a ping every 2 seconds right after
    party.addEventListener('open', () => {
        debug('Connected!')
        debug('Sending a ping every 3 seconds...')

        clearInterval(pingInterval)
        pingInterval = setInterval(() => {
            party.send('ping')
        }, 3000)
    })

    return state
}

export default State
