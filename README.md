# WebSocketHibernationServer

A quickstart for building real-time WebSocket chat on Cloudflare Workers. This monorepo includes a Durable Object backend with automatic session hibernation and a minimal Vite + React frontend.

## Included

**Backend** — a `WebSocketHibernationServer` base class built on Durable Objects, plus a `Lobby` subclass that implements a persistent chat room with history.

**Frontend** — a Vite + React app with a minimal chat interface that connects to the lobby over WebSocket.

## What is hibernation?

Normally a Durable Object stays alive (and billed) for as long as any WebSocket connection is open. For a chat room where users sit idle between messages, this means paying for idle compute.

Hibernation solves this. The DO can be evicted from memory between messages and only wakes up when a WebSocket message actually arrives. Cloudflare preserves the open WebSocket connections themselves — the DO just isn't running in between.

## How this works

**Accepting connections with `ctx.acceptWebSocket()`** instead of the standard `ws.accept()` opts into hibernation. Cloudflare takes over management of the socket.

**`serializeAttachment({ id })`** staples a session ID onto each WebSocket object. Since in-memory state is wiped on hibernation, this is how we know who a socket belongs to when the DO wakes back up.

**`ctx.getWebSockets()`** in the constructor retrieves all sockets that survived hibernation. We iterate these on every wake to rebuild the `sessions` map from the attached data.

**`ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"))`** responds to ping messages automatically without waking the DO at all. Keeps connections alive for free.

## Lifecycle hooks

The base class handles all the boilerplate. Subclasses override three methods:

```ts
protected async onConnect(ws: WebSocket, session: Session): Promise<void>
protected async onMessage(ws: WebSocket, session: Session, message: string | ArrayBuffer): Promise<void>
protected async onDisconnect(ws: WebSocket, session: Session): Promise<void>
```

## The Lobby

`Lobby.ts` extends `WebSocketHibernationServer` with a shared chat room. It persists up to 50 chat entries in Durable Object storage so new connections receive history on join. It broadcasts join/leave events and chat messages to all connected sessions.

## Helpers

`send(ws, type, data)` — sends a typed JSON message to one socket.

`broadcast(type, data, exclude?)` — sends to all connected sockets, optionally skipping one (e.g. the sender).

## Frontend

The React app (`App.tsx`) connects to the lobby WebSocket using the `useWebSocket` hook and renders a `Chat` component. The hook keeps a stable `onMessage` callback ref so message handlers never go stale, and it handles cleanup on unmount gracefully — waiting for the socket to open before closing it if needed.

## Getting started (backend + frontend commands are the same)

```bash
# Install dependencies
yarn

# Run locally
yarn dev

# Deploy to Cloudflare
yarn deploy
```