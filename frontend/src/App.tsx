import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { Chat } from "./components/Chat";
import type { ChatEntry } from "./components/Chat";

const SERVER_URL = "ws://localhost:8787";

export default function App() {
  const [lobbyChatEntries, setLobbyChatEntries] = useState<ChatEntry[]>([]);

  const addChatEntry = (setter: typeof setLobbyChatEntries, entry: ChatEntry) => {
    setter((prev) => [...prev, entry]);
  };

  const lobby = useWebSocket(
    SERVER_URL,
    {
      onMessage: (data) => {
        if (data.type === "CHAT_HISTORY") setLobbyChatEntries(data.entries as ChatEntry[]);
        if (data.type === "CHAT_MESSAGE") addChatEntry(setLobbyChatEntries, { kind: "message", sessionId: data.sessionId as string, text: data.text as string });
        if (data.type === "CHAT_EVENT") addChatEntry(setLobbyChatEntries, { kind: "event", event: data.event as "joined" | "left", sessionId: data.sessionId as string });
      }
    }
  );


  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-mono flex items-center justify-center">
        <div className="flex gap-8 items-start">
          <div className="flex flex-col gap-4 w-48">
            <p className="text-xs text-gray-500">Lobby · {lobby.status}</p>
          </div>

          <Chat
            entries={lobbyChatEntries}
            sendMessage={(text) => lobby.send("CHAT_MESSAGE", { text })}
            disabled={lobby.status !== "connected"}
          />
          
        </div>
     
    </div>
  );
}