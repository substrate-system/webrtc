
import { test } from '@substrate-system/tapzero'
import webrtc from './src/index.js'

test('Peer 1 WebRTC Connection', function (t) {
    const connection = webrtc('test-room-integration')

    connection.on('open', () => {
        t.ok(true, 'Peer 1: Connection opened')
        connection.send('Hello from Peer 1')
    })

    connection.on('message', (data) => {
        if (data === 'Hello from Peer 2') {
            t.ok(true, 'Peer 1: Received expected message from Peer 2')
            t.end()
            setTimeout(() => process.exit(0), 500)
        }
    })

    connection.on('error', (error) => {
        t.fail('Peer 1: Connection error: ' + error.message)
        t.end()
    })

    // Timeout after 30 seconds
    setTimeout(() => {
        t.fail('Peer 1: Test timeout')
        t.end()
    }, 30000)
})
