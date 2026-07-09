/** Posts a plain-text message to a Slack/Teams incoming webhook if EXPORT_WEBHOOK_URL is set. */
export async function notifyWebhook(text: string) {
  const url = process.env.EXPORT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[webhook] failed", err);
  }
}
