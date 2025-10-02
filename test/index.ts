import 'dotenv/config'
import { test } from '@substrate-system/tapzero'

test('WebRTC exports things', async t => {
    // Test that the module can be imported
    const { connect, Connection } = await import('../dist/index.js')

    t.ok(connect, 'connect function should exist')
    t.ok(Connection, 'Connection class should exist')
})
