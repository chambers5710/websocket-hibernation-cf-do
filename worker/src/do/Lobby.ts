import { WebSocketHibernationServer } from "./WebSocketHibernationServer";

type ChatEntry = { kind: "message"; sessionId: string; text: string } | { kind: "event"; event: "joined" | "left"; sessionId: string };

export class Lobby extends WebSocketHibernationServer {
  private readonly CHAT_HISTORY_KEY = "chat_history";
  private readonly MAX_CHAT_ENTRIES = 50;

  private async getChatHistory(): Promise<ChatEntry[]> {
    const stored = await this.ctx.storage.get(this.CHAT_HISTORY_KEY);
    return stored ? (stored as ChatEntry[]) : [];
  }

  private async appendChatEntry(entry: ChatEntry): Promise<void> {
    const history = await this.getChatHistory();
    history.push(entry);
    if (history.length > this.MAX_CHAT_ENTRIES) {
      history.shift();
    }
    await this.ctx.storage.put(this.CHAT_HISTORY_KEY, history);
  }

   protected async onConnect(ws: WebSocket, session: { id: string }) {
    this.send(ws, "WELCOME", { sessionId: session.id });
    
    const chatHistory = await this.getChatHistory();
    this.send(ws, "CHAT_HISTORY", { entries: chatHistory });
    
    const joinedEntry: ChatEntry = { kind: "event", event: "joined", sessionId: session.id };
    await this.appendChatEntry(joinedEntry);
    
    this.broadcast("PLAYER_JOINED", { sessionId: session.id }, ws);
    this.broadcast("CHAT_EVENT", { event: "joined", sessionId: session.id }, ws);
  }

   protected async onMessage(ws: WebSocket, session: { id: string }, message: string | ArrayBuffer) {
    const { type, ...data } = JSON.parse(message as string);

    if (type === "CHAT_MESSAGE") {
      const chatEntry: ChatEntry = { kind: "message", sessionId: session.id, text: data.text };
      await this.appendChatEntry(chatEntry);
      this.broadcast("CHAT_MESSAGE", { sessionId: session.id, text: data.text });
    }
  }

    protected async onDisconnect(ws: WebSocket, session: { id: string }) {
    const leftEntry: ChatEntry = { kind: "event", event: "left", sessionId: session.id };
    await this.appendChatEntry(leftEntry);
    
    this.broadcast("PLAYER_LEFT", { sessionId: session.id });
    this.broadcast("CHAT_EVENT", { event: "left", sessionId: session.id });
  }
}