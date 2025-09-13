import type * as Party from 'partykit/server'

export default class Server implements Party.Server {
    readonly room:Party.Room
    readonly CF_TURN_API_TOKEN:string
    readonly CF_TURN_APP_ID:string

    private peers:Map<string, {  // map from ID string to partykit connection
        id:string,
        conn:Party.Connection
    }> = new Map()

    constructor (room:Party.Room) {
        this.room = room
        this.CF_TURN_API_TOKEN = process.env.CF_TURN_API_TOKEN!
        this.CF_TURN_APP_ID = process.env.CF_TURN_APP_ID!

        console.log('WebRTC signaling server started for room:', room.id)
    }

    static async onBeforeConnect (req:Party.Request, _lobby:Party.Lobby) {
        // auth could go here
        return req
    }

    /**
     * Handle HTTP requests for the TURN credentials.
     */
    async onRequest (req:Party.Request):Promise<Response> {
        if (req.method !== 'GET') {
            return new Response(null, { status: 405 })
        }

        // request is GET
        const { CF_TURN_API_TOKEN, CF_TURN_APP_ID } = this

        if (req.url.includes('/turn')) {
            // get credentials for Cloudflare
            const res = await fetch(
                'https://rtc.live.cloudflare.com/v1/turn/keys/' + CF_TURN_APP_ID +
                    '/credentials/generate',
                {
                    headers: {
                        Authorization: `Bearer ${CF_TURN_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ttl: 86400 })
                }
            )
            if (!res.ok) {
                const text = await res.text()
                console.error('credentials failed', text)
                return new Response(text, { status: res.status })
            }

            const data = await res.json()

            const iceServers = [
                // { urls: ['stun:stun.l.google.com:19302'] },
                // { urls: ['stun:stun1.l.google.com:19302'] },
                {
                    urls: data.iceServers.urls,
                    username: data.iceServers.username,
                    credential: data.iceServers.credential
                }
            ]

            return Response.json({ iceServers }, {
                status: 200,
                headers: defaultHeaders()
            })
        }

        return new Response('WebRTC Signaling Server', {
            status: 200,
            headers: defaultHeaders()
        })
    }

    async onConnect (conn:Party.Connection, _ctx:Party.ConnectionContext) {
        console.log(`New connection to room: ${this.room.id}`)
        this.peers.set(conn.id, { id: conn.id, conn })
        this.broadcastPeerList()
    }

    onClose (conn:Party.Connection) {
        // Remove peer
        for (const [peerId, peer] of this.peers) {
            if (peer.conn.id === conn.id) {
                this.peers.delete(peerId)
                console.log(`Peer disconnected: ${peerId}`)
                break
            }
        }

        // Notify all remaining peers about the disconnection
        this.broadcastPeerList()
    }

    private broadcastPeerList () {
        const peerList = Array.from(this.peers.keys())
        console.log(`Broadcasting peer list to ${this.peers.size} peers:`, peerList)

        // Send updated peer list to all connected peers
        for (const [peerId, peer] of this.peers) {
            const otherPeers = peerList.filter(id => id !== peerId)
            peer.conn.send(JSON.stringify({
                type: 'info:peerlist',
                peers: otherPeers
            }))
        }
    }

    onMessage (message:string, sender:Party.Connection) {
        this.room.broadcast(message, [sender.id])
    }
}

Server satisfies Party.Worker

function defaultHeaders ():Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
}
