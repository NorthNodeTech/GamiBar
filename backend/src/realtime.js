import { createAdminClient } from "./supabase-admin.js";

const pendingSignals = new Map();
const SIGNAL_SEND_ATTEMPTS = 2;
const SIGNAL_SEND_TIMEOUT_MS = 4_000;
const SIGNAL_RETRY_DELAY_MS = 200;

export async function sendRealtimeSignal(topic, event, payload = {}) {
  let admin;
  let channel;
  let lastError;
  try {
    admin = createAdminClient();
    await admin.realtime.setAuth();
    channel = admin.channel(topic, { config: { private: true } });
    const signalPayload = {
      ...payload,
      changedAt: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= SIGNAL_SEND_ATTEMPTS; attempt += 1) {
      try {
        const result = await channel.httpSend(event, signalPayload, {
          timeout: SIGNAL_SEND_TIMEOUT_MS,
        });
        if (result?.success !== true) {
          throw new Error("Realtime did not accept the broadcast.");
        }
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < SIGNAL_SEND_ATTEMPTS) {
          await delay(SIGNAL_RETRY_DELAY_MS * attempt);
        }
      }
    }
  } catch (error) {
    lastError = error;
  } finally {
    if (admin && channel) {
      try {
        await admin.removeChannel(channel);
      } catch (error) {
        console.warn("Realtime channel cleanup failed", {
          topic,
          event,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (lastError) {
    console.warn(
      "Realtime signal skipped",
      {
        topic,
        event,
        attempts: channel ? SIGNAL_SEND_ATTEMPTS : 0,
        message:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }
  return false;
}

/**
 * Collapse bursts (for example, a whole class answering together) into one invalidation.
 * Room state remains durable in Postgres; Broadcast only tells clients when to refetch.
 */
export function queueRealtimeSignal(topic, event, payload = {}, delayMs = 100) {
  const key = `${topic}:${event}`;
  const existing = pendingSignals.get(key);
  if (existing) {
    existing.payload = payload;
    return;
  }

  const pending = { payload, timer: undefined };
  pending.timer = setTimeout(() => {
    pendingSignals.delete(key);
    void sendRealtimeSignal(topic, event, pending.payload);
  }, delayMs);
  pending.timer.unref?.();
  pendingSignals.set(key, pending);
}

export function roomPublicTopic(roomId) {
  return `room:${roomId}:public`;
}

export function roomHostTopic(roomId) {
  return `room:${roomId}:host`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
