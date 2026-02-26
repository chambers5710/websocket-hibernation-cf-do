import { Lobby } from "./do/Lobby";
export { Lobby };

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const id = env.LOBBY.idFromName("lobby");
		const stub = env.LOBBY.get(id);
		return stub.fetch(request);
	}
}