# notes

## health check for the websocket server

### start the websocket server

```sh
npm run party
```

### check

Visit the page `http://localhost:1999/parties/main/example` in a browser



------------------------------------------------------------------------


* [cloudflare data channels](https://developers.cloudflare.com/calls/datachannels/)

## [A Dead Simple WebRTC Example](https://ephemeral.cx/2014/09/a-dead-simple-webrtc-example/)

> An ICE candidate is essentially a description of how to connect to a client.

> In order for anyone to connect to us, we need to share our ICE candidates
> with the other client. 

> if we’re the caller (we clicked the start button), we **create an offer**
> which tells the other client how to interact with us once the network
> connection is established.
>
> The formal name for this called Session Description Protocol or SDP.

> Once an RTCPeerConnection object is created, it will start gathering
> ICE candidates.

> Once we have an offer (`gotDescription` was called), we set the local
> description to it and then send it to the signaling server to be sent to the
> other client.

This means once we have created an offer (an SDP about ourselves)

Above is for client 1, the client who initiates connection.

### What about the answering client?

> we need to answer the incoming offer, not create a new offer.

> 1. determine if the message is a description or an ICE candidate
>
> 2. If a description, we set it as the remote description on our
> `RTCPeerConnection` object and then create an answer. 
>
> If the message is an ICE candidate, all we need to do is add the candidate
> to the `RTCPeerConnection` object.



----------------------------


* [A simple RTCDataChannel sample](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample)


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

