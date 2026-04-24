"use client";

import { useEffect, useRef } from "react";

type StreamMessage = {
  id: string;
  messageid: string;
  text: string;
  fromMe: boolean;
  messageTimestamp: number;
  messageType: string;
  sender: string;
  senderName: string;
  chatid: string;
  ack?: number;
};

/**
 * Subscribes to /api/chat/stream for the given chatid and invokes onBatch
 * each time the server flushes new messages. Returns true when SSE is
 * carrying the conversation; the caller should disable its fallback
 * polling whenever this hook reports `available = true` (set via the ref
 * the caller passes in).
 *
 * The SSE endpoint closes itself every ~50s and emits a `reconnect`
 * event with the latest cursor; we transparently re-open with that
 * cursor so no message slips through.
 *
 * On 404 (no Lead row, e.g. groups), we don't reconnect — the caller's
 * polling fallback handles those threads.
 */
export function useChatStream(
  chatid: string | null,
  initialAfterTs: number,
  onBatch: (messages: StreamMessage[]) => void,
  onAvailability: (available: boolean) => void
) {
  const sourceRef = useRef<EventSource | null>(null);
  const cursorRef = useRef<number>(initialAfterTs);
  const onBatchRef = useRef(onBatch);
  const onAvailabilityRef = useRef(onAvailability);
  const stoppedRef = useRef(false);

  useEffect(() => {
    onBatchRef.current = onBatch;
  }, [onBatch]);
  useEffect(() => {
    onAvailabilityRef.current = onAvailability;
  }, [onAvailability]);

  useEffect(() => {
    cursorRef.current = initialAfterTs;
  }, [initialAfterTs]);

  useEffect(() => {
    if (!chatid) return;
    stoppedRef.current = false;

    const open = () => {
      if (stoppedRef.current) return;
      const url = `/api/chat/stream?chatid=${encodeURIComponent(chatid)}&afterTs=${cursorRef.current}`;
      const es = new EventSource(url, { withCredentials: true });
      sourceRef.current = es;

      let everConnected = false;
      let reconnectScheduled = false;

      const scheduleReconnect = (delayMs: number) => {
        if (reconnectScheduled || stoppedRef.current) return;
        reconnectScheduled = true;
        setTimeout(() => {
          reconnectScheduled = false;
          es.close();
          if (sourceRef.current === es) sourceRef.current = null;
          open();
        }, delayMs);
      };

      es.addEventListener("hello", () => {
        everConnected = true;
        onAvailabilityRef.current(true);
      });

      es.addEventListener("messages", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data) as { messages: StreamMessage[]; cursor: number };
          if (data.cursor > cursorRef.current) cursorRef.current = data.cursor;
          if (data.messages.length > 0) onBatchRef.current(data.messages);
        } catch {
          /* malformed — ignore */
        }
      });

      es.addEventListener("reconnect", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data) as { cursor: number };
          if (data.cursor > cursorRef.current) cursorRef.current = data.cursor;
        } catch {
          /* ignore */
        }
        scheduleReconnect(50);
      });

      es.onerror = () => {
        if (!everConnected) {
          // Most likely 404 (no Lead) or auth failure — let the caller fall
          // back to polling and don't keep retrying.
          onAvailabilityRef.current(false);
          stoppedRef.current = true;
          es.close();
          if (sourceRef.current === es) sourceRef.current = null;
          return;
        }
        // Real disconnect mid-stream: reconnect after a short backoff.
        scheduleReconnect(1000);
      };
    };

    open();

    return () => {
      stoppedRef.current = true;
      onAvailabilityRef.current(false);
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };
  }, [chatid]);
}
