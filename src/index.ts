import { Lobby } from "./do/Lobby";
import { GameRoom } from "./do/GameRoom";

export { Lobby, GameRoom };

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/room/")) {
			const roomId = url.pathname.split("/room/")[1];
			const id = env.GAME_ROOM.idFromName(roomId);
			const stub = env.GAME_ROOM.get(id);
			return stub.fetch(request);
		}

		const id = env.LOBBY.idFromName("lobby");
		const stub = env.LOBBY.get(id);
		return stub.fetch(request);
	},
};