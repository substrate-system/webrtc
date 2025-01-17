# cloudflare + turn

## credentials

It works. See the test file.

See https://developers.cloudflare.com/calls/turn/generate-credentials/

Make an API call to the auth service.

The call:
```sh
curl https://rtc.live.cloudflare.com/v1/turn/keys/$TURN_KEY_ID/credentials/generate \
--header "Authorization: Bearer $TURN_KEY_API_TOKEN" \
--header "Content-Type: application/json" \
--data '{"ttl": 86400}'
```

The returned JSON looks like this:
```js
{
  "iceServers": {
    "urls": [
      "stun:stun.cloudflare.com:3478",
      "turn:turn.cloudflare.com:3478?transport=udp",
      "turn:turn.cloudflare.com:3478?transport=tcp",
      "turns:turn.cloudflare.com:5349?transport=tcp"
    ],
    "username": "bc91b63e2b5d759f8eb9f3b58062439e0a0e15893d76317d833265ad08d6631099ce7c7087caabb31ad3e1c386424e3e",
    "credential": "ebd71f1d3edbc2b0edae3cd5a6d82284aeb5c3b8fdaa9b8e3bf9cec683e0d45fe9f5b44e5145db3300f06c250a15b4a0"
  }
}
```

Use it in the front-end like this:

```js
const myPeerConnection = new RTCPeerConnection({
  iceServers: [
    {
      urls: [
        "stun:stun.cloudflare.com:3478",
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      username: "REPLACE_WITH_USERNAME",
      credential: "REPLACE_WITH_CREDENTIAL",
    },
  ],
});
```

----------------------------------------

## [Create a TURN app](https://dash.cloudflare.com/91f17a38dc4e8d98c2571e35ab3982f1/calls/create-turn-service-keys)

> You need to generate short-lived credentials for each TURN user. In order to
> create credentials, you should have a back-end service that uses your TURN
> Token ID and API token to generate credentials. It will need to make an API
> call like this:

```sh
curl -X POST \
	-H "Authorization: Bearer c1e30cb88d2b25d8280074562e8ee39150aad31d5bc79f2493643f321e56217c" \
	-H "Content-Type: application/json" -d '{"ttl": 86400}' \
	https://rtc.live.cloudflare.com/v1/turn/keys/d4d59f174801ad6f4d6f0d08577a7a22/credentials/generate
```

Need a backend service to use the seecrets `TOKEN_ID` and `API_TOKEN` to 
generate a new short-liced credential.
