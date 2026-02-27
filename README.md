# WebSocketHibernationServer

A Cloudflare Workers framework for building real-time WebSocket-based games and applications. Built on Durable Objects with automatic session hibernation for cost-efficient server-side state management.

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

## Example subclasses

### Lobby

A shared space where players connect, host games, or join existing ones:

```ts
export class Lobby extends WebSocketHibernationServer {
  protected async onConnect(ws: WebSocket, session: { id: string; }) {
    this.send(ws, "WELCOME", { sessionId: session.id });
  }

  protected async onMessage(ws: WebSocket, session: { id: string; }, message: string | ArrayBuffer) {
    const { type } = JSON.parse(message as string);
    if (type === "HOST_GAME") {
      this.broadcast("GAME_HOSTED", { hostedBy: session.id }, ws);
    }
  }

  protected async onDisconnect(ws: WebSocket, session: { id: string; }) {
    this.broadcast("PLAYER_LEFT", { sessionId: session.id });
  }
}
```

### GameRoom with Storage

A `GameRoom` subclass can persist player assignments and game state using Durable Object storage. See [GameRoom.ts](src/do/GameRoom.ts) for a full example that uses `GameRoomStorage` to maintain player roles and game state across hibernation cycles.

## Routing to multiple Durable Objects

Each Durable Object handles its own WebSocket connections independently. Use `idFromName()` to create or retrieve specific instances:

```ts
// Route to shared lobby
const lobbyId = env.LOBBY.idFromName("lobby");
const lobbyStub = env.LOBBY.get(lobbyId);

// Route to per-room game instances
const gameRoomId = env.GAME_ROOM.idFromName(roomId);
const gameRoomStub = env.GAME_ROOM.get(gameRoomId);
```

This allows one shared Lobby instance talking to many isolated GameRoom instances.

## Helpers

`send(ws, type, data)` — sends a typed JSON message to one socket.

`broadcast(type, data, exclude?)` — sends to all connected sockets, optionally skipping one (e.g. the sender).

## Frontend integration with React

Use this hook to connect your React frontend to the WebSocket server:

```tsx
import { useEffect, useRef, useState } from "react";

type MessageHandler = (data: Record<string, unknown>) => void;

export function useWebSocket(url: string, onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  useEffect(() => {
    if (!url) return;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onmessage = (e) => onMessageRef.current(JSON.parse(e.data));
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("disconnected");

    return () => ws.close();
  }, [url]);

  function send(type: string, data: Record<string, unknown> = {}) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }

  return { send, status };
}
```