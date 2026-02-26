import { WebSocketHibernationServer } from "./WebSocketHibernationServer";

export class Lobby extends WebSocketHibernationServer {
  protected async onConnect(ws: WebSocket, session: { id: string; }) {
    console.log("New Connection: ", session.id);
    this.send(ws, "WELCOME", { sessionId: session.id });
  }

  protected async onMessage(ws: WebSocket, session: { id: string; }, message: string | ArrayBuffer) {
    const { type } = JSON.parse(message as string);

    if (type === "HOST_GAME") {
      this.broadcast("GAME_HOSTED", { hostedBy: session.id }, ws);
    }

    if (type === "JOIN_GAME") {
      this.broadcast("GAME_JOINED", { joinedBy: session.id });
    }
  }

  protected async onDisconnect(ws: WebSocket, session: { id: string; }) {
    this.broadcast("PLAYER_LEFT", { sessionId: session.id });
  }
}