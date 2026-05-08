"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type WebSocketEvent = {
  event: string;
  [key: string]: unknown;
};

type UseWebSocketOptions = {
  url: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
};

export function useWebSocket({ url, reconnectDelayMs = 800, maxReconnectDelayMs = 8000 }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<WebSocketEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(reconnectDelayMs);
  const reconnectTimerRef = useRef<number | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearReconnectTimer();
    try {
      wsRef.current?.close();
    } catch {
      // ignore
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = reconnectDelayMs;
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, maxReconnectDelayMs);
        connect();
      }, reconnectDelayRef.current);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as WebSocketEvent;
        setLastEvent(data);
        setEventHistory((prev) => [data, ...prev].slice(0, 50));
      } catch {
        // ignore invalid JSON
      }
    };
  }, [url, clearReconnectTimer, reconnectDelayMs, maxReconnectDelayMs]);

  useEffect(() => {
    connect();
    return () => {
      clearReconnectTimer();
      wsRef.current?.close();
    };
  }, [connect, clearReconnectTimer]);

  const api = useMemo(
    () => ({
      lastEvent,
      isConnected,
      eventHistory,
      send: (payload: unknown) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      },
    }),
    [lastEvent, isConnected, eventHistory]
  );

  return api;
}

