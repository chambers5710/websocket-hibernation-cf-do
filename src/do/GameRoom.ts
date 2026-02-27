import { GameRoomStorage, PlayerRole } from "./GameRoomStorage";
import { WebSocketHibernationServer } from "./WebSocketHibernationServer";

export class GameRoom extends WebSocketHibernationServer {
  private storage: GameRoomStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.storage = new GameRoomStorage(ctx.storage);
  }

  protected async onConnect(ws: WebSocket, session: { id: string }) {
    const players = await this.storage.getPlayers();
    let role: PlayerRole | null = null;

    if (!players.player1) {
      await this.storage.setPlayer("player1", session.id);
      role = "player1";
    } else if (!players.player2) {
      await this.storage.setPlayer("player2", session.id);
      role = "player2";
      this.broadcast("PLAYER_JOINED", { sessionId: session.id, role }, ws)
    }
    // No role = spectator (not handled yet)
    this.send(ws, "ROOM_JOINED", { sessionId: session.id, role });
  }

  protected async onMessage(ws: WebSocket, session: { id: string }, message: string | ArrayBuffer) {
    const { type } = JSON.parse(message as string);

    if (type === "MOVE") {
      this.broadcast("MOVE_MADE", { by: session.id }, ws);
    }
  }

  protected async onDisconnect(ws: WebSocket, session: { id: string }) {
    await this.storage.removePlayer(session.id);
    this.broadcast("PLAYER_LEFT", { sessionId: session.id });
  }
}