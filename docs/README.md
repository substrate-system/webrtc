# notes

## [signaling](https://webrtc.org/getting-started/peer-connections)

ICE -- Internet Connectivity Establishment

> Signaling is needed in order for two peers to share how they should connect.
> Usually this is solved through a regular HTTP-based Web API (i.e., a REST
> service or other RPC mechanism)

## MDN

### [Using WebRTC data channels](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels)

1. [Create a data channel](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels#creating_a_data_channel)

#### options

1. **the easy way** -- Let WebRTC create the transport and announce it to the
remote peer for you
2. Write your own code to negotiate the data transport and write your own code
to signal to the other peer that it needs to connect to the new channel.
This way is more work, but more flexible.

------------

Lets use [automatic negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels#automatic_negotiation)

