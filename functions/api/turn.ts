import ky from 'ky'
import type { Env } from '../../_functions/types'

// response example
// {
//  iceServers: {
//    urls: [
//      'stun:stun.cloudflare.com:3478',
//      'turn:turn.cloudflare.com:3478?transport=udp',
//      'turn:turn.cloudflare.com:3478?transport=tcp',
//      'turns:turn.cloudflare.com:5349?transport=tcp'
//    ],
//    username: 'abc123',
//    credential: 'abc123'
//  }
// }
//

/**
 * Use the secret cloudflare tokens to get credentials for clients.
 */
export const onRequest:PagesFunction<Env> = async (ctx) => {
    const { env } = ctx
    const { CF_TURN_TOKEN_ID, CF_TURN_API_TOKEN } = env

    const res = await ky.post(
        'https://rtc.live.cloudflare.com/v1/turn/keys/' + CF_TURN_TOKEN_ID +
            '/credentials/generate',
        {
            headers: {
                Authorization: `Bearer ${CF_TURN_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            json: { ttl: 86400 }
        }
    )

    return res
}
