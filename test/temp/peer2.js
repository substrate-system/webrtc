
import { test } from '@substrate-system/tapzero'
import webrtc from './src/index.js'

// Wait a bit for peer 1 to be ready
setTimeout(() => {
    test('Peer 2 WebRTC Connection', function (t) {
        const connection = webrtc('test-room-integration')

        connection.on('open', () => {
            t.ok(true, 'Peer 2: Connection opened')
            connection.send('Hello from Peer 2')
        })

        connection.on('message', (data) => {
            if (data === 'Hello from Peer 1') {
                t.ok(true, 'Peer 2: Received expected message from Peer 1')
                t.end()
                setTimeout(() => process.exit(0), 500)
            }
        })

        connection.on('error', (error) => {
            t.fail('Peer 2: Connection error: ' + error.message)
            t.end()
        })

        // Timeout after 30 seconds
        setTimeout(() => {
            t.fail('Peer 2: Test timeout')
            t.end()
        }, 30000)
    })
}, 2000)
