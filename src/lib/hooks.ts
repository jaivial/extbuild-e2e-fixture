import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetch a JSON endpoint, with optional polling. */
export function useApi<T>(path: string | null, pollMs = 0): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    api
      .get<T>(path)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setError("unauthorized");
        } else {
          setError(e instanceof Error ? e.message : "error");
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, tick]);

  useEffect(() => {
    if (!path || pollMs <= 0) return;
    const id = setInterval(reload, pollMs);
    return () => clearInterval(id);
  }, [path, pollMs, reload]);

  return { data, loading, error, reload };
}

/** Subscribe to the Control Center WebSocket and receive snapshot payloads. */
export function useControlCenterSocket(
  sections: string[],
  onSnapshot: (data: Record<string, unknown>) => void,
) {
  const cb = useRef(onSnapshot);
  cb.current = onSnapshot;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closed = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${proto}://${location.host}/ws/admin/control-center`);
      socket.onopen = () => {
        attempts = 0;
        setConnected(true);
        socket?.send(JSON.stringify({ type: "snapshot.request", sections }));
      };
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if ((msg.type === "snapshot" || msg.type === "snapshot.part") && msg.data) {
            cb.current(msg.data);
          }
        } catch { /* ignore */ }
      };
      socket.onclose = () => {
        setConnected(false);
        if (closed) return;
        const delay = Math.min(30000, 500 * 2 ** attempts++);
        timer = setTimeout(connect, delay);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.join(",")]);

  return connected;
}

/** Generic reconnecting WebSocket to a backend path (same-origin). */
export function useSocket(path: string, onMessage: (ev: Record<string, unknown>) => void) {
  const cb = useRef(onMessage);
  cb.current = onMessage;
  const [live, setLive] = useState(false);
  useEffect(() => {
    let ws: WebSocket | null = null, closed = false, retry = 1000, timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}${path}`);
      ws.onopen = () => { retry = 1000; setLive(true); };
      ws.onmessage = (e) => { try { const ev = JSON.parse(e.data); if (ev.type !== "ping") cb.current(ev); } catch { /* ignore */ } };
      ws.onclose = () => { setLive(false); if (closed) return; timer = setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); };
    };
    connect();
    return () => { closed = true; clearTimeout(timer); ws?.close(); };
  }, [path]);
  return live;
}
