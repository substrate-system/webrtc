# webrtc

Webrtc for humans.

<details><summary><h2>Contents</h2></summary>
<!-- toc -->
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
const webrtc = require('@substrate-system/webrtc/module')
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

Start a local websocket server and also a `vite` server for the front-end:

```sh
npm start
```
