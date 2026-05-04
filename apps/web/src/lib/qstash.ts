import { Client } from "@upstash/qstash";

const qstashToken = process.env.QSTASH_TOKEN;
const qstashUrl = process.env.QSTASH_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

const client = qstashToken ? new Client({ token: qstashToken, baseUrl: qstashUrl }) : null;

export async function schedulePublication(draftId: string, scheduledAt: string) {
  if (!client) {
    console.warn("[QStash] QSTASH_TOKEN not set. Skipping dynamic scheduling.");
    return null;
  }

  try {
    const url = `${appUrl}/api/cron/publish`;
    const res = await client.publishJSON({
      url,
      body: { draftId },
      notBefore: Math.floor(new Date(scheduledAt).getTime() / 1000),
    });

    console.log(`[QStash] Scheduled publication for draft ${draftId} at ${scheduledAt}. Message ID: ${res.messageId}`);
    return res.messageId;
  } catch (error) {
    console.error(`[QStash] Failed to schedule publication:`, error);
    return null;
  }
}

export async function cancelPublication(messageId: string) {
  if (!client) return;

  try {
    await client.messages.delete(messageId);
    console.log(`[QStash] Cancelled publication for message ${messageId}`);
  } catch (error) {
    console.error(`[QStash] Failed to cancel publication:`, error);
  }
}
