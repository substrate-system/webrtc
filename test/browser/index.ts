import { test } from '@substrate-system/tapzero'

test('example', async t => {
    t.ok(true, 'should be an example')
})

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
