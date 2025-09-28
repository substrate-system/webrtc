# webrtc

[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/webrtc/nodejs.yml?style=flat-square)](https://github.com/substrate-system/webrtc/actions/workflows/nodejs.yml)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/webrtc)](https://packagephobia.com/result?p=@substrate-system/webrtc)
[![GZip size](https://img.shields.io/bundlephobia/minzip/@substrate-system/webrtc?style=flat-square)](https://bundlephobia.com/package/@substrate-system/webrtc)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


WebRTC for humans.

Use this module to simplify [webrtc data channel connections](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels).
This library combines signaling events with webrtc events, because we only
need to know about a few things &mdash; did we connect to a peer? which peers
exist? and did we get a new message?

<details><summary><h2>Contents</h2></summary>
<!-- toc -->
</details>

[You can use the example app here]().

![Screenshot of the example app](image.png)

## Install

```sh
npm i -S @substrate-system/webrtc
```

## Get Started

You need 2 things: a [Partykit server](https://www.partykit.io/) and a
[TURN server](https://webrtc.org/getting-started/turn-server). The good news
is that both of these are easy & free to use.

For the TURN server, I recommend [Cloudflare's service](https://developers.cloudflare.com/realtime/turn/).
It is easy to setup and free for demonstration purposes.

If you want to run the example app locally, you will need to create a .env file
following the example in [.env.example](./.env.example). Replace the
variables with your own Cloudflare credentials.

### Websocket Server

In [your Partykit project](https://docs.partykit.io/quickstart/),
create a server that inherits from the `/server` path here. This is a
[signaling server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#the_signaling_server).

See [./example_backend](./example_backend/).

```ts
import type * as Party from 'partykit/server'
import Server, { defaultHeaders } from '@substrate-system/webtrc/server'

export default class PartyServer extends Server {
    async onRequest (req:Party.Request):Promise<Response> {
        const res = await super.onRequest(req)

        // example: set the headers in response
        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: defaultHeaders()
        })
    }
}

Server satisfies Party.Worker
```

### Client Example

```ts
import { type Connection, connect } from '@substrate-system/webrtc'
import Debug from '@substrate-system/debug'
const debug = Debug(true)

const connection = await connect({
    host: PARTYKIT_HOST,
    room: 'example'
})

// now we are connected to the websocket server,
// because we awaited the connection

connection.on('message', ev => {
    debug('message event', ev)
})

connection.on('peerlist', list => {
    debug('peerlist event', list)
})

connection.on('peer', ([peerId, dc]) => {
    // now we are connected to a peer
    debug('peer', peerId)
    debug('data channel', dc)
})

connection.on('message', ev => {
    debug('got a message from peer', ev.peer)
    debug('the message content', ev.data)
})

connection.on('peerlist', list => {
    debug('the list of peers connected to the websocket:', list)
})

connection.on('peer', ([peerId, _dc]:[string, RTCDataChannel]) => {
    // when a connection is established to a peer
    debug('new peer connection', peerId)
})
```


## API

```js
import { webrtc } from '@substrate-system/webrtc'

// Create a connection with a room ID
const connection = webrtc('my-unique-room-id')

connection.on('open', () => {
  console.log('Connected!')
  connection.send('Hello!')
})

connection.on('message', (data) => {
  console.log('Received:', data)
})
```

## Develop

1. Run `npm start` to start a vite localhost server and a partykit local server
2. Open two browser windows to `http://localhost:8889`
3. Use the same room ID in both windows
4. Click "Connect" in both windows
5. Start sending messages

## Testing

Run `npm test` to execute the automated integration tests that:
- Start local PartyKit and Cloudflare servers
- Wait for servers to be ready
- Run two browser instances with tapzero tests
- Verify WebRTC connections work end-to-end


## Modules

### ESM
```js
import { webrtc } from '@substrate-system/webrtc'
```

### Common JS
```js
const webrtc = require('@substrate-system/webrtc')
```

### pre-built JS
This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/webrtc/dist/index.min.js ./public/webrtc.min.js
```

#### HTML
```html
<script type="module" src="/webrtc.min.js"></script>
```

## Develop

Start a local websocket server, a local lambda function server,
and also a `vite` server for the front-end.

```sh
npm start
```

To run the example, you will need to create a cloudflare account
and [generate credentials](https://developers.cloudflare.com/calls/turn/generate-credentials/).
Paste the credentials into `.dev.vars`.

### Deploy

Deploying the backend means [deploying partykit](https://docs.partykit.io/guides/deploying-your-partykit-server/).

To deploy with environment variables in a `.env` file, run with the flag
`--with-vars`.

```sh
npx partykit deploy --with-vars
```

### `.env` file

```sh
# .env
NODE_ENV="development"
DEBUG="*"
CF_TURN_NAME="my-server-name"
CF_TURN_TOKEN_ID="123abc"
CF_TURN_API_TOKEN="123bc"
```


-------


## [Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)

The pattern to establish a connection.

> Because WebRTC doesn't mandate a specific transport mechanism for signaling
> during the negotiation of a new peer connection, it's highly flexible.

> Negotiation is an inherently asymmetric operation: one side needs to serve
> as the "caller" while the other peer is the "callee."

> [...] your application doesn't need to care which end of the connection it is.

> the same code is used for both the caller and the callee


Assign each of the two peers a role to play in the negotiation process:

* A **polite** peer, which uses ICE rollback to prevent collisions with
  incoming offers. May send out offers, but then responds if an offer arrives
  from the other peer with "Okay, never mind, drop my offer and I'll consider
  yours instead."
* An **impolite** peer, which always ignores incoming offers that collide with
  its own offers. Always ignores incoming offers that collide with its
  own offers.

Both peers know exactly what should happen if there are collisions
between offers.


**We assign the polite role to the first peer to connect to the**
**signaling server**.

The two peers can then work together to manage signaling in a way that
doesn't deadlock.

## See Also

* [fippo/minimal-webrtc](https://github.com/fippo/minimal-webrtc)
* [Establishing a connection: The WebRTC perfect negotiation pattern](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation).
