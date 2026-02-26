# WebSocketHibernationServer

A base Durable Object class that handles the WebSocket lifecycle with Cloudflare's hibernation API.

## What is hibernation?

Normally a Durable Object stays alive (and billed) for as long as any WebSocket connection is open. For a card game where players sit and think between moves, this means paying for idle compute.

Hibernation solves this. The DO can be evicted from memory between messages and only wakes up when a WebSocket message actually arrives. Cloudflare preserves the open WebSocket connections themselves — the DO just isn't running in between.

## How this class uses it

**Accepting connections with `ctx.acceptWebSocket()`** instead of the standard `ws.accept()` is what opts you into hibernation. Cloudflare takes over management of the socket.

**`serializeAttachment({ id })`** staples a session ID onto each WebSocket object. Since in-memory state is wiped on hibernation, this is how we know who a socket belongs to when the DO wakes back up.

**`ctx.getWebSockets()`** in the constructor retrieves all sockets that survived hibernation. We iterate these on every wake to rebuild the `sessions` map from the attached data.

**`ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"))`** responds to ping messages automatically without waking the DO at all. Keeps connections alive for free.

## Lifecycle hooks for subclasses

The base class handles all the boilerplate. Subclasses override three methods:

```ts
// Called when a new player connects
protected async onConnect(ws: WebSocket, session: Session): Promise<void>

// Called when a player sends a message
protected async onMessage(ws: WebSocket, session: Session, message: string | ArrayBuffer): Promise<void>

// Called when a player disconnects
protected async onDisconnect(ws: WebSocket, session: Session): Promise<void>
```

## Example subclass

```ts
export class Lobby extends WebSocketHibernationServer {
    protected async onConnect(ws: WebSocket, session: Session) {
        this.send(ws, "WELCOME", { message: "You are in the lobby" });
    }

    protected async onMessage(ws: WebSocket, session: Session, message: string | ArrayBuffer) {
        const { type } = JSON.parse(message as string);
        if (type === "HOST_GAME") {
            this.broadcast("GAME_HOSTED", { hostedBy: session.id }, ws);
        }
    }

    protected async onDisconnect(ws: WebSocket, session: Session) {
        this.broadcast("PLAYER_LEFT", { id: session.id });
    }
}
```

## Helpers

`send(ws, type, data)` — sends a typed JSON message to one socket.

`broadcast(type, data, exclude?)` — sends to all connected sockets, optionally skipping one (e.g. the sender).