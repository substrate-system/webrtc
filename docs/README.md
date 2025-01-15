# notes

* [signaling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#the_signaling_server)

## [perfect negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)

### [the logic](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#the_perfect_negotiation_logic)

> Now we get into the true perfect negotiation logic, which functions entirely
> independently from the rest of the application.

> we implement the `RTCPeerConnection` event handler `onnegotiationneeded` to
> get a local description and send it using the signaling channel to the
> remote peer.

--------

next

[Handling incoming ICE candidates](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#handling_incoming_ice_candidates)

> need to handle the RTCPeerConnection event icecandidate

-------------

### [concepts](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#perfect_negotiation_concepts)

>  Negotiation is an inherently asymmetric operation: one side needs to serve as
> the "caller" while the other peer is the "callee." 

>
> independent negotiation logic
>   - **polite** peer
>   - **impolite** peer
>

> both peers know exactly what should happen if there are collisions between
> offers that have been sent.

How to determine polite vs impolite? 

> It could be as simple as assigning the polite role to the first peer to
> connect to the signaling server, or you could do something more elaborate like
> having the peers exchange random numbers and assigning the polite role to
> the winner. 

1st peer to connect is **polite** peer.

-------

> The roles of **caller** and **callee** can switch during perfect negotiation.

> If the polite peer is the caller and it sends an offer but there's a collision
> with the impolite peer, the polite peer drops its offer and instead replies to
> the offer it has received from the impolite peer. By doing so, the polite peer
> has switched from being the caller to the callee!

### [Implementing perfect negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#implementing_perfect_negotiation)

> The code assumes that there's a SignalingChannel class defined that is used
> to communicate with the signaling server.

Need to implement a signaling server. That's what we're using partykit for.

1. create `RTCPeerConnection`. This happens in the constructor. Also need
a **STUN** server.

#### STUN (Session Traversal Utilities for NAT)

See [MDN docs](https://developer.mozilla.org/en-US/docs/Glossary/STUN).

Google's free STUN server is `stun.l.google.com`.

use it like this
```js
const config = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302'] }
    ]
}
```

-------

Also need a [signaling server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#the_signaling_server).

> To allow the server to support signaling and ICE negotiation, we'll have to
> allow directing messages to one specific user, and ensure unrecognized message
> types are passed through and delivered.

__Need to__ setup a server that forwards messages from one user to a different,
specific user.

The second user must send the first offer, because it knows the id of the other
user.


--------------------------------

### Exchanging session descriptions

#### Create an "offer"

> When starting the signaling process, an **offer** is created by the user
> initiating the call. 

This is the second user to connect, b/c they know the id of the first user.

The offer includes a session description, in [SDP](https://developer.mozilla.org/en-US/docs/Glossary/SDP)
format.

#### answer
The callee responds to the offer with an **answer** message

Signaling server needs to transmit offer messages and answer messages.
The answer message also contains an SDP.


-----------------------------------------------------------------

## health check for the websocket server

### start the websocket server

```sh
npm run party
```

### check

Visit the page `http://localhost:1999/parties/main/example` in a browser



------------------------------------------------------------------------

* [cloudflare data channels](https://developers.cloudflare.com/calls/datachannels/)

-------------------------------------------------------------------------


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

