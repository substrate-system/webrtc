import { signal, type Signal } from '@preact/signals'
import { Party } from './party-client.js'
import { Peer } from '../src/index.js'
import Debug from '@substrate-system/debug'
const debug = Debug()

export const State = function ():{
    status:Signal<'disconnected'|'connected'>;
    peer:Peer;
} {  // eslint-disable-line indent
    const peer = new Peer()
    const party = Party()
    let pingInterval:ReturnType<typeof setInterval>

    // @ts-expect-error dev
    window.party = party

    // You can even start sending messages before the connection is open!
    party.addEventListener('message', (ev) => {
        debug(`Received -> ${ev.data}`)
    })

    // Let's listen for when the connection opens
    // And send a ping every 2 seconds right after
    party.addEventListener('open', () => {
        debug('Connected!')
        debug('Sending a ping every 2 seconds...')

        clearInterval(pingInterval)
        pingInterval = setInterval(() => {
            party.send('ping')
        }, 3000)
    })

    return {
        peer,
        status: signal('disconnected')
    }
}

export default State
