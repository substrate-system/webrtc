import type * as Party from 'partykit/server'
import Server, { defaultHeaders } from '../src/server.js'

export default class PartyServer extends Server {
    /**
     * Example of setting headers on the response.
     */
    async onRequest (req:Party.Request):Promise<Response> {
        const res = await super.onRequest(req)

        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: defaultHeaders()
        })
    }
}

Server satisfies Party.Worker
