import { useEffect, useRef, useState } from "react";

export type ChatEntry =
  | { kind: "message"; sessionId: string; text: string }
  | { kind: "event"; event: "joined" | "left"; sessionId: string };

interface ChatProps {
  entries: ChatEntry[];
  sendMessage: (text: string) => void;
  disabled?: boolean;
}

export function Chat({ entries, sendMessage, disabled }: ChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed) {
      sendMessage(trimmed);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col w-80 h-96 border border-gray-700 bg-gray-900 font-mono text-sm">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {entries.map((entry, i) =>
          entry.kind === "event" ? (
            <div key={i} className="text-gray-500 italic">
              {entry.sessionId.slice(0, 8)} {entry.event === "joined" ? "joined" : "left"}
            </div>
          ) : (
            <div key={i} className="text-gray-200">
              <span className="text-blue-400 mr-2">{entry.sessionId.slice(0, 8)}</span>
              {entry.text}
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex border-t border-gray-700">
        <input
          className="flex-1 bg-transparent px-3 py-2 text-gray-200 outline-none placeholder-gray-600"
          type="text"
          placeholder={disabled ? "Connecting..." : "Say something..."}
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          maxLength={300}
        />
        <button
          className="px-4 py-2 text-gray-400 border-l border-gray-700 hover:text-gray-200 disabled:opacity-30"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}