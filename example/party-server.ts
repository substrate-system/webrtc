import type * as Party from 'partykit/server'

export default class Server implements Party.Server {
    readonly room
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
        // A websocket just connected!
        console.log(
        `Connected:
            id: ${conn.id}
            room: ${this.room.id}
            url: ${new URL(ctx.request.url).pathname}`
        )

        // let's send a message to the connection
        conn.send('hello from server')
        this.room.broadcast('connected', [conn.id])
    }

    onClose (party:Party.Connection) {
        this.room.broadcast('disconnected: ' + party.id)
    }

    onMessage (message:string, sender:Party.Connection) {
        // let's log the message
        console.log(`connection ${sender.id} sent message: ${message}`)
        // as well as broadcast it to all the other connections in the room...
        this.room.broadcast(
            `${sender.id}: ${message}`,
            // ...except for the connection it came from
            [sender.id]
        )
    }
}

Server satisfies Party.Worker
