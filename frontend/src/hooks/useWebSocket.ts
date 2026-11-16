import { useEffect, useRef, useState, useCallback } from 'react';

interface PulseData {
  stream_id: string;
  timestamp_offset: number;
  chat_rate: number;
  baseline: number;
  audio_level: number;
}

interface HighlightEventData {
  id: string;
  stream_id: string;
  category: string;
  score: number;
  reasons: string[];
  offset: number;
  title?: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [latestPulse, setLatestPulse] = useState<PulseData | null>(null);
  const [latestHighlightEvent, setLatestHighlightEvent] = useState<HighlightEventData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'stream_pulse') {
            setLatestPulse(parsed.data);
          } else if (parsed.event === 'highlight_detected') {
            setLatestHighlightEvent(parsed.data);
          }
        } catch (e) {
          // ignore ping/pong or plain text
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { isConnected, latestPulse, latestHighlightEvent };
}
