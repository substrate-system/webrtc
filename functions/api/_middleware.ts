import { ENV_URLS } from '../../_functions/CONSTANTS.js'
import type { Env } from '../../_functions/types.js'
import { DEFAULT_HEADERS } from '../../_functions/util.js'

const PROD_URL = ENV_URLS['production']

/**
 * Any `OPTIONS` type request
 */
export const onRequestOptions:PagesFunction<Env> = async (ctx) => {
    if (
        ctx.env.NODE_ENV === 'development' ||
        ctx.env.NODE_ENV === 'staging'
    ) {
        // is dev
        // return permissive headers
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'PUT, POST, GET, OPTIONS',
                'Access-Control-Max-Age': '86400',
            },
        })
    }

    // production headers
    const res = new Response(null, {
        headers: {
            'Access-Control-Allow-Methods': 'POST,GET,PUT,OPTIONS',
            'Access-Control-Allow-Origin': PROD_URL,
            'Access-Control-Allow-Headers':
                'Origin, X-Requested-With, Content-Type, Accept, Authorization',
            'Access-Control-Max-Age': '2592000',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Security-Policy': `default-src 'self' ; connect-src 'self' blob: wss://${PROD_URL} https://*.backblaze.com https://*.backblazeb2.com ; img-src 'self' blob: data: ; media-src 'self' blob: ; object-src 'none' ; script-src 'self' ; style-src 'self' 'unsafe-inline' ; base-uri 'none' ; frame-ancestors 'self' ; form-action 'self'`,
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-site; report-to="default";',
            'Cross-Origin-Resource-Policy': 'same-site',
            'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), sync-xhr=(), interest-cohort=()',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '0',
        }
    })

    return res
}

/**
 * Any request (not options)
 */
export const onRequest:PagesFunction<Env> = async (ctx) => {
    const { env } = ctx
    const response = await ctx.next()

    if (
        env.NODE_ENV === 'development' ||
        env.NODE_ENV === 'staging'
    ) {
        // is dev, return permissive headers
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Max-Age', '86400')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods',
            'POST,GET,PUT,OPTIONS')
        response.headers.set('Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, Authorization')

        return response
    } else {
        // production headers
        Object.keys(DEFAULT_HEADERS).forEach(name => {
            response.headers.set(name, DEFAULT_HEADERS[name])
        })
    }

    return response
}
