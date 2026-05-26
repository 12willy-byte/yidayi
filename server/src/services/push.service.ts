/**
 * Expo Push Notification Service
 *
 * Sends push notifications via Expo's Push API.
 * Requires the target device to have registered its ExpoPushToken via POST /api/push/register.
 *
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string; // ExpoPushToken
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  ttl?: number;
}

export interface PushResult {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: unknown;
}

/**
 * Send a single push notification via Expo Push API.
 */
export async function sendPush(message: PushMessage): Promise<PushResult> {
  try {
    const payload = {
      to: message.to,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: message.sound ?? "default",
      badge: message.badge,
      priority: message.priority || "high",
      ttl: message.ttl || 86400, // 24h default
    };

    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // Expo returns { data: { status, id, message?, details? } }
    const ticket = (result as any)?.data || result;

    if (ticket.status === "ok") {
      return { status: "ok", id: ticket.id };
    }

    return {
      status: "error",
      message: ticket.message || "推送发送失败",
      details: ticket.details || ticket,
    };
  } catch (err: any) {
    return { status: "error", message: err.message };
  }
}

/**
 * Send push notifications to multiple devices (batch).
 * Expo API accepts an array of messages.
 */
export async function sendPushBatch(
  messages: PushMessage[]
): Promise<PushResult[]> {
  try {
    const payload = messages.map((m) => ({
      to: m.to,
      title: m.title,
      body: m.body,
      data: m.data || {},
      sound: m.sound ?? "default",
      badge: m.badge,
      priority: m.priority || "high",
      ttl: m.ttl || 86400,
    }));

    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const tickets: any[] = (result as any)?.data || [];

    return tickets.map((ticket: any) => {
      if (ticket.status === "ok") {
        return { status: "ok" as const, id: ticket.id };
      }
      return {
        status: "error" as const,
        message: ticket.message || "推送发送失败",
        details: ticket.details || ticket,
      };
    });
  } catch (err: any) {
    return messages.map(() => ({
      status: "error" as const,
      message: err.message,
    }));
  }
}

/**
 * Send a daily outfit recommendation push to a specific user.
 * Retrieves the user's push tokens and sends to all their devices.
 */
export async function sendDailyOutfitPush(
  userId: string,
  title: string,
  body: string
): Promise<{ sent: number; errors: number }> {
  // Dynamic import to avoid circular dependency
  const { query } = await import("../db.js");

  const tokensResult = await query(
    "SELECT token FROM push_tokens WHERE user_id = ?",
    [userId]
  );

  const tokens = tokensResult.rows.map((r: any) => r.token as string);

  if (tokens.length === 0) {
    return { sent: 0, errors: 0 };
  }

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data: { type: "daily_outfit", userId },
  }));

  const results = await sendPushBatch(messages);

  const sent = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;

  return { sent, errors };
}
