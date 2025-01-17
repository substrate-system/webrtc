import { scryptAsync } from '@noble/hashes/scrypt'
import { ENV_URLS } from './CONSTANTS.js'
import type { Env } from '../_functions/types'
import { toString, fromString } from 'uint8arrays'
import { webcrypto } from '@bicycle-codes/one-webcrypto'

export async function hashPassword (
    password:string,
    _salt?:Uint8Array|string
):Promise<string> {
    let salt = _salt || webcrypto.getRandomValues(new Uint8Array(32))
    if (typeof salt === 'string') {
        salt = fromString(salt, 'base64')
    }

    const hashedPw = await scryptAsync(
        password,
        salt,
        { N: 2 ** 16, r: 8, p: 1, dkLen: 32 }
    )

    const hashString = toString(salt, 'base64') + ':' +
        toString(hashedPw, 'base64')

    return hashString
}

export async function comparePasswords (
    pwA:string,  // user input
    hashB:string  // from DB
):Promise<boolean> {
    const [salt, b] = hashB.split(':')
    const [_, a] = (await hashPassword(pwA, salt)).split(':')

    return a === b
}

export const DEFAULT_HEADERS = {
    'Access-Control-Allow-Methods': 'POST,GET,PUT,OPTIONS',
    'Access-Control-Allow-Origin': ENV_URLS.production,
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Max-Age': '2592000',
    'Access-Control-Allow-Credentials': 'true',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-site; report-to="default";',
    'Cross-Origin-Resource-Policy': 'same-site',

    /**
     * Secure your application with Content-Security-Policy headers.
     * Enabling these headers will permit content from a trusted domain and all
     *    its subdomains.
     *  @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
     */
    'Content-Security-Policy': "default-src 'self' silver-key.app *.silver-key.app",

    /**
     * You can also set Strict-Transport-Security headers.
     *   These are not automatically set because your website might get added to
     *     Chrome's HSTS preload list.
     *   Here's the code if you want to apply it:
     */
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    /**
     * Permissions-Policy header provides the ability to allow or deny the use
     *   of browser features, such as opting out of FLoC - which you can use below:
     */
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), sync-xhr=(), interest-cohort=()',

    /**
     * X-XSS-Protection header prevents a page from loading if an XSS attack
     *   is detected.
     *   @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
     */
    'X-XSS-Protection': '0',

    /**
     * X-Frame-Options header prevents click-jacking attacks.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
     */
    'X-Frame-Options': 'DENY',

    /**
     *  X-Content-Type-Options header prevents MIME-sniffing.
     *  @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
     */
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
}

export function getSecretForChild (env:Env, dbName:string) {
    return env.FAUNA_SECRET + ':' + dbName + ':admin'
}

export function emailToDbName (email:string) {
    return email.replace('@', '_').replace('.', '_')
}

export function parseHeader (header?:string):undefined|{ token:string } {
    if (!header) return
    const parts = header.split(' ')
    const token = parts[2]
    return { token }
}
