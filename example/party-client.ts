import PartySocket from 'partysocket'
import Debug from '@substrate-system/debug'
const debug = Debug()
const PARTYKIT_HOST:string = 'http://localhost:1999'

let pingInterval:ReturnType<typeof setInterval>

// A PartySocket is like a WebSocket, except it's a bit more magical.
// It handles reconnection logic, buffering messages while it's offline,
// and more.
const conn = new PartySocket({
    host: PARTYKIT_HOST,
    room: 'example',
})

// You can even start sending messages before the connection is open!
conn.addEventListener('message', (ev) => {
    debug(`Received -> ${ev.data}`)
})

// Let's listen for when the connection opens
// And send a ping every 2 seconds right after
conn.addEventListener('open', () => {
    debug('Connected!')
    debug('Sending a ping every 2 seconds...')

    clearInterval(pingInterval)
    pingInterval = setInterval(() => {
        conn.send('ping')
    }, 1000)
})
