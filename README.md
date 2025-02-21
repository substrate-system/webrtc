# webrtc

[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![license](https://img.shields.io/badge/license-Polyform_Non_Commercial-26bc71?style=flat-square)](LICENSE)


Webrtc for humans.

The example code depends on cloudflare as a STUN/TURN server.
To run the demo, you will need to create a cloudflare account
and [generate credentials](https://developers.cloudflare.com/calls/turn/generate-credentials/).


<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [install](#install)
- [Modules](#modules)
  * [ESM](#esm)
  * [Common JS](#common-js)
  * [pre-built JS](#pre-built-js)
- [use](#use)
  * [JS](#js)
- [develop](#develop)
  * [`.dev.vars`](#devvars)
  * [start a local server](#start-a-local-server)

<!-- tocstop -->

</details>

## install

```sh
npm i -S @substrate-system/webrtc
```

## Modules

This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

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

## use

### JS
```js
import { webrtc } from '@substrate-system/webrtc'
```

## develop

Start a local websocket server and also a `vite` server for the hront-end.

To run the example, you will need to create a cloudflare account
and [generate credentials](https://developers.cloudflare.com/calls/turn/generate-credentials/). Paste the credentials into `.dev.vars`.

### `.dev.vars`

```sh
# .dev.vars
NODE_ENV="development"
DEBUG="*"
CF_TURN_NAME="my-server-name"
CF_TURN_TOKEN_ID="123abc"
CF_TURN_API_TOKEN="123bc"
```

### start a local server

```sh
npm start
```
