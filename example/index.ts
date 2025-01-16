import { type FunctionComponent, render } from 'preact'
import { useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { computed } from '@preact/signals'
import { State } from './state'
import '@nichoth/components/text-input.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

const state = State()

const isConnected = computed(() => {
    return state.status.value === 'connected'
})

const { me } = state

// @ts-expect-error dev
window.me = me

me.on('open', () => {
    state.status.value = 'connected'
    debug('open')
})

me.on('close', () => {
    state.status.value = 'disconnected'
    debug('close')
})

const Example:FunctionComponent = function () {
    const connect = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        debug('connecting...')
        me.connect()
    }, [])

    const sendMsg = useCallback((ev:SubmitEvent) => {
        ev.preventDefault()
        const form = ev.target as HTMLFormElement
        const input = form.elements['text'].value
        debug('send the text', input)
        me.channel?.send(input)
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

