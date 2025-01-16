# cloudflare + turn

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
