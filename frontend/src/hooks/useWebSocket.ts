import { useEffect, useRef, useState } from "react";

type MessageHandler = (data: Record<string, unknown>) => void;
type CloseHandler = (code: number, reason: string) => void;

interface UseWebSocketOptions {
  onMessage: MessageHandler;
  onClose?: CloseHandler;
}

export function useWebSocket(url: string, { onMessage, onClose }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onCloseRef = useRef(onClose);
  onMessageRef.current = onMessage;
  onCloseRef.current = onClose;

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  useEffect(() => {
    if (!url) return;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      if (e.data === "pong") return;
      onMessageRef.current(JSON.parse(e.data));
    };
    ws.onopen = () => setStatus("connected");
    ws.onclose = (e) => {
      setStatus("disconnected");
      onCloseRef.current?.(e.code, e.reason);
    };
    ws.onerror = () => setStatus("disconnected");

    return () => {
      console.log("[ws] cleanup, closing:", url);
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close(1000, "cleanup");
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "cleanup");
      }
    };
  }, [url]);

  function send(type: string, data: Record<string, unknown> = {}) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }

  return { send, status };
}