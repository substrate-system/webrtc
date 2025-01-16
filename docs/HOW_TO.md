# how to

WebRTC, how does it work?

We are using ["perfect negotiation"](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation).

---------

## perfect negotiation

Separate the negotiation process from the rest of your application's logic.

This all happens with a websocket server for signaling.

The __caller__ is the first peer to initiate a connection, that is, send
an __offer__. The __callee__ is the one who receives the first offer.

Perfect negotiation is good because **your application doesn't need to care**
**which end of the connection it is**. The same code is used for both the
caller and the callee.

## 2 roles

Each of two peers get assigned a role, either **polite** or **impolite**. It
is arbitrary which peer gets assigned "polite" or not. As long as one is polite
and the other is impolite.

We assign the first peer to connect the **polite** role. This is a little bit
tricky when you handle disconnect & reconnect, i.e. changing roles during a
session. See [line 96](../src/index.ts#L96).
