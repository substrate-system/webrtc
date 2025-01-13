import { type FunctionComponent, render } from 'preact'
import { useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { TextInput } from '@nichoth/components/htm/text-input'
import { Peer } from '../src/index.js'
import '@nichoth/components/text-input.css'
import Debug from '@substrate-system/debug'
const debug = Debug()

const peer = new Peer()

debug('the peer', peer)

const Example:FunctionComponent<unknown> = function () {
    const click = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        debug('click')
    }, [])

    const submit = useCallback((ev:SubmitEvent) => {
        ev.preventDefault()
        const form = ev.target as HTMLFormElement
        const input = form.elements['text'].value
        debug('submit the text', input)
    }, [])

    return html`<div>
        <button onClick=${click}>connect</button>

        <hr />

        <form onSubmit=${submit}>
            <${TextInput}
                className="input"
                displayName="message"
                class="message"
                name="text"
            />
            <button type="submit">send</button>
        </form>
        
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
