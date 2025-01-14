import { signal, type Signal } from '@preact/signals'
import { Peer } from '../src/index.js'

export const State = function ():{
    status:Signal<'disconnected'|'connected'>;
    peer:Peer;
} {  // eslint-disable-line indent
    const peer = new Peer()

    return {
        peer,
        status: signal('disconnected')
    }
}

export default State
