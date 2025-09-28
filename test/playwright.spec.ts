import { test, expect, } from '@playwright/test'

test.describe('WebRTC Tests', () => {
    test('WebSocket server should be accessible', async ({ page }) => {
        const response = await page.goto('http://localhost:1999/parties/main/test')
        expect(response?.status()).toBe(200)
    })

    test('WebSocket connection should work with native WebSocket', async ({
        page
    }) => {
        await page.goto('data:text/html,<html><body></body></html>')

        const result = await page.evaluate(async () => {
            // Test native WebSocket connection to the PartyKit server
            return new Promise((resolve, reject) => {
                const ws = new WebSocket('ws://localhost:1999/parties/main/test')

                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'))
                }, 5000)

                ws.addEventListener('open', () => {
                    clearTimeout(timeout)
                    ws.close()
                    resolve('connected')
                })

                ws.addEventListener('error', (error) => {
                    clearTimeout(timeout)
                    reject(error)
                })
            })
        })

        expect(result).toBe('connected')
    })

    test('WebRTC connection should establish between two peers', async ({ browser }) => {
        const context1 = await browser.newContext()
        const context2 = await browser.newContext()
        const page1 = await context1.newPage()
        const page2 = await context2.newPage()

        await page1.goto('data:text/html,<html><body></body></html>')
        await page2.goto('data:text/html,<html><body></body></html>')

        // Load the test bundle
        await page1.addScriptTag({ path: './test/test-bundle.js' })
        await page2.addScriptTag({ path: './test/test-bundle.js' })

        const room = 'test-room-' + Math.random().toString(36).substring(7)

        // Test connection on first peer (should be polite)
        const connection1Promise = page1.evaluate(async (room): Promise<{
            connected: boolean
            hasSocket: boolean
            polite: boolean
            socketId?: string
            peerlistReceived: boolean
            timeout?: boolean
            error?: string
        }> => {
            const connect = window.WebRTCTest.connect

            try {
                const connection = await connect({
                    host: 'http://localhost:1999',
                    room
                })

                return new Promise((resolve) => {
                    let peerlistReceived = false

                    connection.on('peerlist', () => {
                        peerlistReceived = true
                        setTimeout(() => {
                            resolve({
                                connected: !!connection,
                                hasSocket: !!connection.socket,
                                polite: connection.polite,
                                socketId: connection.socket?.id,
                                peerlistReceived
                            })
                        }, 100)
                    })

                    setTimeout(() => {
                        resolve({
                            connected: !!connection,
                            hasSocket: !!connection.socket,
                            polite: connection.polite,
                            socketId: connection.socket?.id,
                            peerlistReceived,
                            timeout: true
                        })
                    }, 5000)
                })
            } catch (error) {
                const err = error as Error
                return {
                    connected: false,
                    hasSocket: false,
                    polite: false,
                    peerlistReceived: false,
                    error: err.message
                }
            }
        }, room)

        // Wait a moment then start second connection
        await page1.waitForTimeout(500)

        // Set polite state for second connection
        await page2.evaluate(() => {
            window.WebRTCTest._nextConnectionPolite = false
        })

        // Test connection on second peer (should be impolite)
        const connection2Promise = page2.evaluate(async (room): Promise<{
            connected: boolean
            hasSocket: boolean
            polite: boolean
            socketId?: string
            peerlistReceived: boolean
            timeout?: boolean
            error?: string
        }> => {
            const connect = window.WebRTCTest.connect

            try {
                const connection = await connect({
                    host: 'http://localhost:1999',
                    room
                })

                return new Promise((resolve) => {
                    let peerlistReceived = false

                    connection.on('peerlist', () => {
                        peerlistReceived = true
                        setTimeout(() => {
                            resolve({
                                connected: !!connection,
                                hasSocket: !!connection.socket,
                                polite: connection.polite,
                                socketId: connection.socket?.id,
                                peerlistReceived
                            })
                        }, 100)
                    })

                    setTimeout(() => {
                        resolve({
                            connected: !!connection,
                            hasSocket: !!connection.socket,
                            polite: connection.polite,
                            socketId: connection.socket?.id,
                            peerlistReceived,
                            timeout: true
                        })
                    }, 5000)
                })
            } catch (error) {
                const err = error as Error
                return {
                    connected: false,
                    hasSocket: false,
                    polite: false,
                    peerlistReceived: false,
                    error: err.message
                }
            }
        }, room)

        const [connection1Result, connection2Result] = await Promise.all([
            connection1Promise,
            connection2Promise
        ])

        expect(connection1Result.connected).toBe(true)
        expect(connection2Result.connected).toBe(true)
        expect(connection1Result.polite).toBe(true)
        expect(connection2Result.polite).toBe(false)

        await context1.close()
        await context2.close()
    })

    test('WebRTC data channel should allow message exchange', async ({ browser }) => {
        const context1 = await browser.newContext()
        const context2 = await browser.newContext()
        const page1 = await context1.newPage()
        const page2 = await context2.newPage()

        await page1.goto('data:text/html,<html><body></body></html>')
        await page2.goto('data:text/html,<html><body></body></html>')

        const room = 'message-test-' + Math.random().toString(36).substring(7)

        // Load the test bundle
        await page1.addScriptTag({ path: './test/test-bundle.js' })
        await page2.addScriptTag({ path: './test/test-bundle.js' })

        // Set up receiver first
        const receiverPromise = page2.evaluate(async (room): Promise<{
            messageReceived: boolean
            messageData?: string
            peerConnected: boolean
            timeout?: boolean
            error?: string
        }> => {
            const connect = window.WebRTCTest.connect

            try {
                const connection = await connect({
                    host: 'http://localhost:1999',
                    room
                })

                return new Promise((resolve) => {
                    let messageReceived = false
                    let messageData = ''
                    let peerConnected = false

                    connection.on('message', (ev) => {
                        messageReceived = true
                        messageData = ev.data
                        resolve({
                            messageReceived,
                            messageData,
                            peerConnected
                        })
                    })

                    connection.on('peer', async () => {
                        peerConnected = true
                    })

                    connection.on('peerlist', async (peers) => {
                        if (peers.length > 0) {
                            await connection.connectToPeer(peers[0])
                        }
                    })

                    setTimeout(() => {
                        resolve({
                            messageReceived,
                            messageData,
                            peerConnected,
                            timeout: true
                        })
                    }, 10000)
                })
            } catch (error) {
                const err = error as Error
                return {
                    messageReceived: false,
                    peerConnected: false,
                    error: err.message
                }
            }
        }, room)

        // Wait a bit then start sender
        await page1.waitForTimeout(500)

        const senderPromise = page1.evaluate(async (room): Promise<{
            messageSent: boolean
            peerConnected: boolean
            timeout?: boolean
            error?: string
        }> => {
            const connect = window.WebRTCTest.connect

            try {
                const connection = await connect({
                    host: 'http://localhost:1999',
                    room
                })

                return new Promise((resolve) => {
                    let messageSent = false
                    let peerConnected = false

                    connection.on('peer', async () => {
                        peerConnected = true

                        // Wait a bit then send message
                        setTimeout(() => {
                            try {
                                connection.send('Hello from sender!')
                                messageSent = true
                                resolve({
                                    messageSent,
                                    peerConnected
                                })
                            } catch (error) {
                                const err = error as Error
                                resolve({
                                    messageSent: false,
                                    peerConnected,
                                    error: err.message
                                })
                            }
                        }, 500)
                    })

                    setTimeout(() => {
                        resolve({
                            messageSent,
                            peerConnected,
                            timeout: true
                        })
                    }, 10000)
                })
            } catch (error) {
                const err = error as Error
                return {
                    messageSent: false,
                    peerConnected: false,
                    error: err.message
                }
            }
        }, room)

        const [receiverResult, senderResult] = await Promise.all([
            receiverPromise,
            senderPromise
        ])

        expect(senderResult.messageSent).toBe(true)
        expect(receiverResult.messageReceived).toBe(true)
        expect(receiverResult.messageData).toBe('Hello from sender!')

        await context1.close()
        await context2.close()
    })

    test('Polite/impolite roles should be assigned correctly', async ({ browser }) => {
        const context1 = await browser.newContext()
        const context2 = await browser.newContext()
        const page1 = await context1.newPage()
        const page2 = await context2.newPage()

        await page1.goto('data:text/html,<html><body></body></html>')
        await page2.goto('data:text/html,<html><body></body></html>')

        const room = 'polite-test-' + Math.random().toString(36).substring(7)

        // Load the test bundle
        await page1.addScriptTag({ path: './test/test-bundle.js' })
        await page2.addScriptTag({ path: './test/test-bundle.js' })

        // First connection should be polite
        const connection1Result = await page1.evaluate(async (room): Promise<{
            connected: boolean
            polite: boolean
            timeout?: boolean
            error?: string
        }> => {
            const connect = window.WebRTCTest.connect

            try {
                const connection = await connect({
                    host: 'http://localhost:1999',
                    room
                })

                return new Promise((resolve) => {
                    connection.on('peerlist', () => {
                        setTimeout(() => {
                            resolve({
                                connected: !!connection,
                                polite: connection.polite
                            })
                        }, 100)
                    })

                    setTimeout(() => {
                        resolve({
                            connected: !!connection,
                            polite: connection.polite,
                            timeout: true
                        })
                    }, 5000)
                })
            } catch (error) {
                const err = error as Error
                return {
                    connected: false,
                    polite: false,
                    error: err.message
                }
            }
        }, room)

        // Wait a bit to ensure first connection is established
        await page1.waitForTimeout(1000)

        // Set polite state for second connection
        await page2.evaluate(() => {
            window.WebRTCTest._nextConnectionPolite = false
        })

        // Second connection should be impolite
        const connection2Result = await page2.evaluate(async (room): Promise<{
            connected: boolean
            polite: boolean
            timeout?: boolean
            error?: string
        }> => {
            const connect = window.WebRTCTest.connect

            try {
                const connection = await connect({
                    host: 'http://localhost:1999',
                    room
                })

                return new Promise((resolve) => {
                    connection.on('peerlist', () => {
                        setTimeout(() => {
                            resolve({
                                connected: !!connection,
                                polite: connection.polite
                            })
                        }, 100)
                    })

                    setTimeout(() => {
                        resolve({
                            connected: !!connection,
                            polite: connection.polite,
                            timeout: true
                        })
                    }, 5000)
                })
            } catch (error) {
                const err = error as Error
                return {
                    connected: false,
                    polite: false,
                    error: err.message
                }
            }
        }, room)

        expect(connection1Result.connected).toBe(true)
        expect(connection2Result.connected).toBe(true)
        expect(connection1Result.polite).toBe(true)
        expect(connection2Result.polite).toBe(false)

        await context1.close()
        await context2.close()
    })
})
