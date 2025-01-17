import { type FunctionComponent, render } from 'preact'
import { useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { computed } from '@preact/signals'
import { State } from './state'
import '@nichoth/components/text-input.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

const state = await State()
State.getIceData(state)

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
        if (!state.config.value) throw new Error('not config!')
        ev.preventDefault()
        me.connect(state.config.value)
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

        <h2>Peers</h2>

        ${state.connections.value.length ?
            html`
                <ul class="peers">
                    ${state.connections.value.map(peer => {
                        return html`<li>${peer}</li>`
                    })}
                </ul>
            ` :
            html`<em>none</em>`
        }

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

render(html`<${Example} />`, document.getElementById('root')!)
