import { type Signal, signal, batch } from '@preact/signals'
import Debug from '@substrate-system/debug'
import { type Connection, connect } from '../src/index.js'
import PartySocket from 'partysocket'
const debug = Debug('example:state')

const PARTYKIT_HOST:string = (import.meta.env.DEV ?
    'http://localhost:1999' :
    'https://rtcparty.nichoth.partykit.dev')

export type ExampleState = {
    status:Signal<'disconnected'|'connecting'|'in-room'|'connected'>;
    roomId:Signal<string>;
    socket:Signal<PartySocket|null>;
    messages:Signal<[string, string][]|[]>;  // messages are [senderId, content]
    availablePeers:Signal<string[]>;  // array of peer IDs
    connection:Signal<Connection|null>;
    peerConnections:Signal<string[]>;  // array of peer IDs
}

export const State = function ():ExampleState {
    const state:ExampleState = {
        status: signal('disconnected'),
        roomId: signal('test-room'),
        socket: signal(null),
        messages: signal([]),
        availablePeers: signal<string[]>([]),
        connection: signal(null),
        peerConnections: signal([]),
    }

    // @ts-expect-error dev
    window.state = state

    return state
}

State.ConnectWs = async function (state:ExampleState):Promise<void> {
    const connection = await connect({
        host: PARTYKIT_HOST,
        room: state.roomId.value
    })

    connection.on('peer-disconnect', peerId => {
        debug('the disconnection event', peerId)
        batch(() => {
            state.peerConnections.value = state.peerConnections.value.filter(id => {
                return id !== peerId
            })
            state.status.value = (state.connection.value?.socket.readyState ===
                PartySocket.OPEN) ?
                'in-room' :
                'disconnected'
        })
    })

    connection.on('datachannel', () => {
        debug('got the datachannel event!')
    })

    connection.on('message', ev => {
        debug('message event', ev)
        state.messages.value = [
            ...state.messages.value,
            [ev.peer, ev.data]
        ]
    })

    connection.on('peerlist', list => {
        debug('peerlist event', list)
        debug('connections', state.connection.value?.connections)
        // if we are already connected to a peer, then leave them in the list
        state.availablePeers.value = [
            ...list,
            ...(state.connection.value?.connections || [])
        ]
    })

    batch(() => {
        state.connection.value = connection
        state.status.value = 'in-room'
        state.socket.value = connection.socket
    })

    connection.on('peer', ([peerId]) => {
        batch(() => {
            state.peerConnections.value = Array.from(new Set([
                ...state.peerConnections.value,
                peerId
            ]))
            state.status.value = 'connected'
        })
    })
}

State.connectToPeer = function (
    state:ExampleState,
    peerId:string
):Promise<RTCDataChannel> {
    if (!state.connection.value) throw new Error('not connection')

    state.status.value = 'connecting'

    return new Promise(resolve => {
        state.connection.value?.once('datachannel', (dc:RTCDataChannel) => {
            state.status.value = 'connected'
            resolve(dc)
        })

        state.connection.value!.connectToPeer(peerId)
    })
}

State.disconnectPeer = function (state:ExampleState, peerId:string) {
    const connection = state.connection.value
    connection?.peerDisconnect()
    batch(() => {
        state.peerConnections.value = state.peerConnections.value.filter(c => {
            return c !== peerId
        })
        state.status.value = 'in-room'
    })
}

/**
 * Disconnect from socket and peer.
 */
State.disconnect = function (state:ExampleState) {
    state.connection.value?.close()
    state.socket.value?.close()

    batch(() => {
        state.availablePeers.value = []
    })

    state.status.value = 'disconnected'
}

/**
 * Send a message to the peer on the data channel.
 */
State.sendMessage = function (state:ExampleState, message:string):void {
    const conn = state.connection.value
    conn!.send(message)
    state.messages.value = [
        ...state.messages.value,
        ['You', message]
    ]
}
