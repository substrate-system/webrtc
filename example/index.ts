import { type FunctionComponent, render } from 'preact'
import { useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { computed, signal } from '@preact/signals'
import { Peer } from '../src/index.js'
import '@nichoth/components/text-input.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

const peer = new Peer()

debug('the peer', peer)

const state = {
    status: signal<'disconnected'|'connected'>('disconnected')
}

const isConnected = computed(() => {
    return state.status.value === 'connected'
})

// @ts-expect-error dev
window.peer = peer

peer.on('open', () => {
    state.status.value = 'connected'
})

peer.on('close', () => {
    state.status.value = 'disconnected'
})

const Example:FunctionComponent<unknown> = function () {
    const connect = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        debug('connecting...')
        peer.connect()
    }, [])

    const listen = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        debug('listening...')
        peer.listen()
    }, [])

    const sendMsg = useCallback((ev:SubmitEvent) => {
        ev.preventDefault()
        const form = ev.target as HTMLFormElement
        const input = form.elements['text'].value
        debug('send the text', input)
        peer.channel?.send(input)
    }, [])

    return html`<div>
        <div>
            <span class="status ${state.status.value}">
                <strong>status: </strong>
                <span>${state.status.value}</span>
            </span>
        </div>

        <div class="controls">
            <button onClick=${connect} disabled=${isConnected}>
                connect
            </button>
            <button onClick=${listen}>listen</button>
        </div>

        <hr />

        <form onSubmit=${sendMsg}>
            <${TextInput}
                className="input"
                displayName="message"
                class="message"
                name="text"
            />

            <button
                disabled=${!isConnected.value}
                type="submit"
            >
                send
            </button>
        </form>
        
    </div>`
}

// const localConnection = null  // RTCPeerConnection for our "local" connection
// const remoteConnection = null  // RTCPeerConnection for the "remote"

// const sendChannel = null  // RTCDataChannel for the local (sender)
// const receiveChannel = null  // RTCDataChannel for the remote (receiver)

window.addEventListener('load', () => {
    render(html`<${Example} />`, document.getElementById('root')!)
}, false)

