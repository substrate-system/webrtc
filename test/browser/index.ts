import { test } from '@substrate-system/tapzero'
import PartySocket from 'partysocket'
import { connect } from '../../src/index'

const PARTYKIT_HOST:string = 'http://localhost:1999'

test('Websocket server', async t => {
    t.plan(2)
    const res = await fetch('http://localhost:1999/parties/main/test')
    t.ok(res.ok, 'server should exist')

    const socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: 'test'
    })

    socket.addEventListener('open', () => {
        t.ok(true, 'should connect via websocket')
    })
})

test('WebSocket protocol with 2 connections', async t => {
    t.plan(8)

    const room = 'test-room-' + Math.random().toString(36).substring(7)

    // Create first connection
    const connection1 = await connect({
        host: PARTYKIT_HOST,
        room
    })

    t.ok(connection1, 'first connection should be created')
    t.ok(connection1.socket, 'first connection should have socket')

    // Create second connection
    const connection2 = await connect({
        host: PARTYKIT_HOST,
        room
    })

    t.ok(connection2, 'second connection should be created')
    t.ok(connection2.socket, 'second connection should have socket')

    // Test peerlist events
    connection1.on('peerlist', (peers) => {
        t.ok(Array.isArray(peers), 'should receive peerlist as array')
    })

    connection1.on('datachannel', (dc) => {
        t.ok(dc instanceof RTCDataChannel,
            'should receive datachannel on connection1')
    })

    connection2.on('datachannel', (dc) => {
        t.ok(dc instanceof RTCDataChannel,
            'should receive datachannel on connection2')
    })

    // Test peer connection
    connection1.on('peer', ([peerId, dc]) => {
        t.ok(typeof peerId === 'string' && dc instanceof RTCDataChannel,
            'should receive peer info with ID and datachannel')
    })

    // Wait a bit for connections to establish
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Initiate peer connection from connection1 to connection2
    await connection1.connectToPeer(connection2.socket.id)

    // Wait for connections to fully establish
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('abc aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    // Clean up connections
    connection1.close()
    connection2.close()
})

test('WebSocket message exchange between 2 connections', async t => {
    t.plan(4)

    const room = 'message-test-' + Math.random().toString(36).substring(7)

    // Create connections
    const connection1 = await connect({
        host: PARTYKIT_HOST,
        room
    })

    const connection2 = await connect({
        host: PARTYKIT_HOST,
        room
    })

    // Set up message listener on connection2
    connection2.on('message', (ev) => {
        t.ok(ev.data, 'should receive message data')
        t.ok(ev.peer, 'should receive peer ID with message')
    })

    // Set up peer connection listener
    connection1.on('peer', ([peerId, _dc]) => {
        t.ok(peerId, 'should connect to peer')

        // Send a test message once connected
        setTimeout(() => {
            try {
                connection1.send('Hello from connection1!')
                t.ok(true, 'should be able to send message')
            } catch (err) {
                t.fail('failed to send message: ' + err)
            }
        }, 500)
    })

    // Wait for initial setup
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Connect peers
    await connection1.connectToPeer(connection2.socket.id || 'peer2')

    // Wait for message exchange
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Clean up
    connection1.close()
    connection2.close()
})

test('WebSocket connection polite/impolite roles', async t => {
    t.plan(2)

    const room = 'polite-test-' + Math.random().toString(36).substring(7)

    // Create first connection (should be polite)
    const connection1 = await connect({
        host: PARTYKIT_HOST,
        room
    })

    // Wait a bit to ensure first connection is established
    await new Promise(resolve => setTimeout(resolve, 500))

    // Create second connection (should be impolite)
    const connection2 = await connect({
        host: PARTYKIT_HOST,
        room
    })

    // Wait for connections to determine their roles
    await new Promise(resolve => setTimeout(resolve, 1000))

    t.ok(connection1.polite === true, 'first connection should be polite')
    t.ok(connection2.polite === false, 'second connection should be impolite')

    // Clean up
    connection1.close()
    connection2.close()
})

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
