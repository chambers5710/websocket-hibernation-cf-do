// Storage key constants
const KEYS = {
  ROOM_ID: "roomId",
  PLAYERS: "players",
  GAME_STATE: "gameState",
} as const;

export type PlayerRole = "player1" | "player2";

export interface StoredPlayers {
  player1: string | null; // sessionId
  player2: string | null; // sessionId
}

// Game state is intentionally untyped for now — to be defined when
// the game state model is designed.
export type StoredGameState = Record<string, unknown> | null;

export class GameRoomStorage {
  protected storage: DurableObjectStorage;

  constructor(storage: DurableObjectStorage) {
    this.storage = storage;
  }
  // --- Room ---

  async getRoomId(): Promise<string | null> {
    return (await this.storage.get<string>(KEYS.ROOM_ID)) ?? null;
  }

  async setRoomId(roomId: string): Promise<void> {
    await this.storage.put(KEYS.ROOM_ID, roomId);
  }

  // --- Players ---

  async getPlayers(): Promise<StoredPlayers> {
    return (await this.storage.get<StoredPlayers>(KEYS.PLAYERS)) ?? {
      player1: null,
      player2: null
    };
  }

  async setPlayer(role: PlayerRole, sessionId: string): Promise<void> {
    const players = await this.getPlayers();
    players[role] = sessionId;
    await this.storage.put(KEYS.PLAYERS, players);
  }

  async removePlayer(sessionId: string): Promise<void> {
    const players = await this.getPlayers();
    if (players.player1 === sessionId) players.player1 = null;
    if (players.player2 === sessionId) players.player2 = null;
    await this.storage.put(KEYS.PLAYERS, players);
  }

  // --- Game State ---
  // Stubbed until the game state model is designed.

  async getGameState(): Promise<StoredGameState> {
    return (await this.storage.get<StoredGameState>(KEYS.GAME_STATE)) ?? null;
  }

  async setGameState(state: StoredGameState): Promise<void> {
    await this.storage.put(KEYS.GAME_STATE, state);
  }
}