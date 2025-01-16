import type { SignalMessage } from '../src/index.js'
import type * as Party from 'partykit/server'

export default class Server implements Party.Server {
    readonly room
    private connections:Party.Connection[] = []

    constructor (room:Party.Room) {
        this.room = room
        console.log('room: ', room)
    }

    async onRequest (req:Party.Request):Promise<Response> {
        if (req.method === 'GET') {
            return new Response("It's working", { status: 200 })
        }

        return new Response('Invalid request method', { status: 405 })
    }

    onConnect (conn:Party.Connection, ctx:Party.ConnectionContext) {
        // a websocket just connected
        console.log(`
        Connected:
            id: ${conn.id}
            room: ${this.room.id}
            url: ${new URL(ctx.request.url).pathname}`
        )

        this.connections.push(conn)

        // send the list of connections to the clients
        this.room.broadcast(JSON.stringify({
            connections: this.connections.map(c => c.id)
        }))
    }

    // a client disconnected
    onClose (party:Party.Connection) {
        console.log('disconnect...', party.id)
        this.connections = this.connections.filter(c => c.id !== party.id)
        console.log('connections...', this.connections.map(c => c.id))
        this.room.broadcast(JSON.stringify({
            connections: this.connections.map(c => c.id)
        }))
    }

    onMessage (message:string, sender:Party.Connection) {
        // let's log the message
        console.log(`connection ${sender.id} sent message: ${message}`)

        let msg:SignalMessage
        try {
            msg = JSON.parse(message)
        } catch (_err) {
            console.log('not json...')
            return
        }

        if (
            'description' in msg &&
            (msg.description.type === 'offer' ||
            msg.description.type === 'answer')
        ) {
            // send the message to its target
            const target = this.connections.find(conn => {
                return conn.id === msg.target
            })
            if (!target) {
                return console.error('not target: ' + msg.target)
            }

            target.send(message)
        }

        // as well as broadcast it to all the other connections in the room...
        // this.room.broadcast(
        //     `${sender.id}: ${message}`,
        //     // ...except for the connection it came from
        //     [sender.id]
        // )
    }
}

Server satisfies Party.Worker
