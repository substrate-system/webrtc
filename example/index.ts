import { type FunctionComponent, render } from 'preact'
import { useRef, useEffect, useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import '@nichoth/components/text-input.css'
import Debug from '@substrate-system/debug'
import { useComputed } from '@preact/signals'
import { ConnectionStatus } from './components/connection-status.js'
import { State } from './state.js'
import '@substrate-system/a11y'

window.localStorage.setItem('DEBUG', 'example,example:*,src,src:*')
const debug = Debug('example')

const Example:FunctionComponent<{
    state:ReturnType<typeof State>
}> = function ({ state }) {
    const isConnected = useComputed<boolean>(() => {
        return state.status.value === 'connected'
    })

    const waitingToConnect = useComputed<boolean>(() => {
        return state.status.value === 'connecting'
    })

    const isInRoom = useComputed<boolean>(() => {
        return state.status.value === 'in-room' || state.status.value === 'connected'
    })

    const connect = useCallback(async (ev: MouseEvent) => {
        ev.preventDefault()
        await State.ConnectWs(state)
    }, [])

    const connectToPeer = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const target = ev.target as HTMLButtonElement
        const peerId = target.dataset['peer']!
        State.connectToPeer(state, peerId)
    }, [])

    const disconnectPeer = useCallback(async (ev:MouseEvent) => {
        ev.preventDefault()
        const target = ev.target as HTMLButtonElement
        const peerId = target.dataset['peer']!
        State.disconnectPeer(state, peerId)
    }, [])

    const sendMsg = useCallback((ev:SubmitEvent) => {
        ev.preventDefault()
        const form = ev.target as HTMLFormElement
        const input = form.elements['text'] as HTMLInputElement
        const message = input.value
        if (!message.trim()) return
        try {
            State.sendMessage(state, message)
            input.value = ''
        } catch (err) {
            debug('error sending message', err)
        }
    }, [])

    const disconnect = useCallback(() => {
        State.disconnect(state)
    }, [])

    const updateRoomId = useCallback((ev:InputEvent) => {
        const input = ev.target as HTMLInputElement
        state.roomId.value = input.value
    }, [state])

    /**
     * auto scroll in the message div
     */
    const messageListRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!messageListRef.current) return
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }, [state.messages.value])  // re-run when messages changes

    return html`
    <h1>WebRTC</h1>
    <div class="col-half">
        <span class="status ${state.status.value}">
            <strong>Status: </strong>
            <span>${state.status.value}</span>
        </span>

        <form>
            <${TextInput}
                displayName="Room ID"
                required=${true}
                name=${'room-id'}
                value=${state.roomId}
                onInput=${updateRoomId}
                disabled=${isInRoom.value}
            //>
        </form>

        <div class="controls">
            <button
                onClick=${connect}
                disabled=${isInRoom.value || state.status.value === 'connecting'}
            >
                ${state.status.value === 'connecting' ?
                    'Connecting...' :
                    'Join Room'
                }
            </button>
            <button
                onClick=${disconnect}
                disabled=${state.status.value === 'disconnected'}
            >
                Leave Room
            </button>
        </div>

        <hr />

        <div class="peers">
            <h3>Available Peers</h3>
            ${state.availablePeers.value.length > 0 ? html`
                <div class="peer-list">
                    ${state.availablePeers.value.map(peerId => {
                        const isConnected =
                            state.peerConnections.value.includes(peerId)
                        const status = isConnected ? 'connected' : 'disconnected'

                        return html`
                            <div class="peer-item">
                                <${ConnectionStatus} status=${status} />
                                <span>${peerId}</span>
                                ${isConnected ?
                                    html`
                                        <button
                                            data-peer=${peerId}
                                            onClick=${disconnectPeer}
                                        >Disconnect</button>
                                    ` :
                                    html`
                                        <button
                                            data-peer=${peerId}
                                            onClick=${connectToPeer}
                                            disabled=${waitingToConnect}
                                        >Connect</button>
                                    `
                                }
                            </div>
                        `
                    })}
                </div>
            ` : isInRoom.value ? html`
                    <p>
                        No other peers in the room. Open another browser window
                        with the same room ID.
                    </p>
                ` :
                'n/a'}
        </div>

        <div class="instructions">
            <h3>Instructions</h3>
            <ol>
                <li>Enter a room ID (same ID for both peers)</li>
                <li>Click "Join Room"</li>
                <li>Open another browser window/tab to this page</li>
                <li>Use the same room ID and join the room</li>
                <li>Click "Connect" next to the peer to start chatting</li>
            </ol>
        </div>
    </div>

    <div class="col-half">
        <div class="messages">
            <h3>Messages</h3>
            <div class="message-list" ref=${messageListRef}>
                ${state.messages.value.map((msg:[string, string]) => {
                    debug('msg', msg)
                    return html`<div class="message">
                        <span class="sender">${shorten(msg[0])}: </span>
                        <span class="msg-content">${msg[1]}</span>
                    </div>`
                })}
            </div>
        </div>

        <form onSubmit=${sendMsg}>
            <textarea
                id="text"
                name="text"
                disabled=${!isConnected.value}
                placeholder="Type a message..."
            ></textarea>
            <button type="submit" disabled=${!isConnected.value}>
                Send Message
            </button>
        </form>
    </div>`
}

const state = State()
render(html`<${Example} state=${state} />`, document.getElementById('root')!)

function shorten (input:string):string {
    return input.slice(0, 8)
}
