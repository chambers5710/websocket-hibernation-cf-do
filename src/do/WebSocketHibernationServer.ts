import { DurableObject } from "cloudflare:workers";

export class WebSocketHibernationServer extends DurableObject<Env> {
  sessions: Map<WebSocket, { id: string }>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();
    this._restoreHibernatedSessions();
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  private async _restoreHibernatedSessions() {
  for (const ws of this.ctx.getWebSockets()) {
    const attachment = ws.deserializeAttachment();
    if (!attachment?.id) {
      ws.close();
      continue;
    }
    this.sessions.set(ws, { id: attachment.id }); // actually restore it
  }
}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);

    const id = crypto.randomUUID();
    server.serializeAttachment({ id });
    this.sessions.set(server, { id });
    await this.onConnect(server, { id });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const session = this.sessions.get(ws);
    if (!session) return;
    await this.onMessage(ws, session, message);
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (session) await this.onDisconnect(ws, session);
  }

  // Lifecycle hooks — override in subclasses
  protected async onConnect(ws: WebSocket, session: { id: string }): Promise<void> {}
  protected async onMessage(ws: WebSocket, session: { id: string }, message: string | ArrayBuffer): Promise<void> {}
  protected async onDisconnect(ws: WebSocket, session: { id: string }): Promise<void> {}

  protected send(ws: WebSocket, type: string, data: Record<string, unknown> = {}) {
    ws.send(JSON.stringify({ type, ...data }));
  }

  protected broadcast(type: string, data: Record<string, unknown> = {}, exclude?: WebSocket) {
    this.sessions.forEach((_, ws) => {
      if (ws !== exclude) this.send(ws, type, data);
    });
  }
}