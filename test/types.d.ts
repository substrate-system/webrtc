declare global {
    interface Window {
        testWebSocketConnection(): Promise<string>
        testWebRTCConnection(room?: string): Promise<{
            connected: boolean
            hasSocket: boolean
            polite: boolean
            socketId?: string
            peerlistReceived: boolean
            timeout?: boolean
            error?: string
        }>
        testMessageExchange(role: 'sender' | 'receiver', room?: string): Promise<{
            messageReceived: boolean
            messageData?: string
            messageSent: boolean
            peerConnected: boolean
            error?: string
            timeout?: boolean
        }>
        WebRTCTest: {
            _connections: Map<string, any[]>
            _nextConnectionPolite: boolean | null
            connect(options: { host: string; room: string }): Promise<{
                socket: any
                polite: boolean
                on(event: string, handler: (...args: any[]) => void): void
                send(message: string): boolean
                connectToPeer(peerId: string): Promise<void>
                close(): void
            }>
        }
    }
}

export {}
