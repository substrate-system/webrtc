import { html } from 'htm/preact'
import { useComputed } from '@preact/signals'
import { type FunctionComponent } from 'preact'

const statusMessages = {
    connecting: 'Connecting to peer...',
    connected: 'Connected to peer',
    disconnected: 'Disconnected from peer'
}

export const ConnectionStatus:FunctionComponent<{
    status:'connected'|'connecting'|'disconnected'
}> = function ConnectionStatus (props) {
    const { status } = props

    const statusMsg = useComputed(() => statusMessages[status])

    return html`<span
        class="connection-status"
        role="status"
        aria-live="polite"
        data-status="${status}"
    >
        <span class="visually-hidden">
            WebSocket connection status: ${statusMsg}
        </span>
    </span>`
}
