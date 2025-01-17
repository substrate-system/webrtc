import 'dotenv/config'
import { test } from '@substrate-system/tapzero'
import ky from 'ky'

const { CF_TURN_TOKEN_ID, CF_TURN_API_TOKEN } = process.env

test('example', async t => {
    const res = await ky.post(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_TOKEN_ID}/credentials/generate`,
        {
            headers: {
                Authorization: `Bearer ${CF_TURN_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            json: { ttl: 86400 }
        }
    )

    console.log('**json**', await res.json())

    t.ok(res, 'should return something')
})
