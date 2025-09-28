import type * as Party from 'partykit/server'
import Server, { defaultHeaders } from '../src/server.js'

export default class PartyServer extends Server {
    async onRequest (req:Party.Request):Promise<Response> {
        if (req.method === 'HEAD') {  // for `wait-on` CLI tool
            return new Response(null, { status: 200 })
        }

        const res = await super.onRequest(req)

        // example: set the headers in response
        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: defaultHeaders()
        })
    }
}

Server satisfies Party.Worker
