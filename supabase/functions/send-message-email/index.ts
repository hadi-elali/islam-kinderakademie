import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_APP_URL = "https://www.bufib-kinder.de";
const SEND_CONCURRENCY = 8;

type MessageRecord = {
  id: number;
  subject: string;
  published_at: string;
};

type MessageWebhookPayload = {
  type: "INSERT" | "UPDATE";
  table: "messages";
  schema: "public";
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

type Recipient = {
  recipient_profile_id: number;
  display_name: string;
  email: string;
};

type RuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  webhookSecret: string;
  brevoApiKey: string;
  senderEmail: string;
  senderName: string;
  appUrl: string;
};

type DeliveryResult = "sent" | "skipped" | "failed";

function createAdminClient(config: RuntimeConfig) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type AdminClient = ReturnType<typeof createAdminClient>;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function secretsMatch(received: string, expected: string) {
  const receivedBytes = new TextEncoder().encode(received);
  const expectedBytes = new TextEncoder().encode(expected);
  const maximumLength = Math.max(receivedBytes.length, expectedBytes.length);
  let difference = receivedBytes.length ^ expectedBytes.length;

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (receivedBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return difference === 0;
}

function parsePayload(value: unknown): MessageWebhookPayload | null {
  const candidate = record(value);
  const type = candidate.type;

  if (
    (type !== "INSERT" && type !== "UPDATE") ||
    candidate.table !== "messages" ||
    candidate.schema !== "public"
  ) {
    return null;
  }

  return {
    type,
    table: "messages",
    schema: "public",
    record: record(candidate.record),
    old_record: candidate.old_record === null
      ? null
      : record(candidate.old_record),
  };
}

function publishedAt(value: Record<string, unknown> | null) {
  if (!value || typeof value.published_at !== "string") return null;

  const timestamp = Date.parse(value.published_at);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function shouldDispatch(payload: MessageWebhookPayload) {
  const currentPublishedAt = publishedAt(payload.record);
  if (currentPublishedAt === null || currentPublishedAt > Date.now()) {
    return false;
  }

  if (payload.type === "INSERT") return true;

  const previousPublishedAt = publishedAt(payload.old_record);
  return previousPublishedAt === null || previousPublishedAt > Date.now();
}

function runtimeConfig(): RuntimeConfig | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("MESSAGE_EMAIL_WEBHOOK_SECRET");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !webhookSecret ||
    !brevoApiKey ||
    !senderEmail
  ) {
    return null;
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    webhookSecret,
    brevoApiKey,
    senderEmail,
    senderName: Deno.env.get("BREVO_SENDER_NAME") || "Islam-Kinderakademie",
    appUrl: (Deno.env.get("APP_BASE_URL") || DEFAULT_APP_URL).replace(
      /\/$/,
      "",
    ),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function notificationHtml(
  displayName: string,
  messageSubject: string,
  messageUrl: string,
) {
  const safeName = escapeHtml(displayName);
  const safeSubject = escapeHtml(messageSubject);
  const safeUrl = escapeHtml(messageUrl);

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Neue Mitteilung</title>
  </head>
  <body style="margin:0;background:#f6f3ea;color:#173d3a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fffefa;border:1px solid #dfe6e1;border-radius:20px;padding:28px;">
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hallo ${safeName},</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;">Du hast eine neue Mitteilung</h1>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#52706d;">
          In der Islam-Kinderakademie wartet eine neue Mitteilung auf dich:
          <strong style="color:#173d3a;">${safeSubject}</strong>
        </p>
        <a href="${safeUrl}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#1e5b52;color:#ffffff;text-decoration:none;font-weight:700;">
          Mitteilung öffnen
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#78908d;">
          Bitte melde dich an, falls du noch nicht angemeldet bist. Der vollständige Inhalt wird nur im geschützten Bereich angezeigt.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function recipient(value: unknown): Recipient | null {
  const candidate = record(value);
  const profileId = Number(candidate.recipient_profile_id);

  if (
    !Number.isSafeInteger(profileId) ||
    profileId <= 0 ||
    typeof candidate.display_name !== "string" ||
    !candidate.display_name.trim() ||
    typeof candidate.email !== "string" ||
    !candidate.email.trim()
  ) {
    return null;
  }

  return {
    recipient_profile_id: profileId,
    display_name: candidate.display_name.trim(),
    email: candidate.email.trim().toLowerCase(),
  };
}

async function markDelivery(
  adminClient: AdminClient,
  deliveryId: number,
  values: Record<string, unknown>,
) {
  const { error } = await adminClient
    .from("message_email_deliveries")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deliveryId);

  if (error) {
    console.error(
      "send-message-email: delivery state update failed",
      error.message,
    );
  }
}

async function sendToRecipient(
  adminClient: AdminClient,
  config: RuntimeConfig,
  message: MessageRecord,
  target: Recipient,
): Promise<DeliveryResult> {
  const { data: claimedId, error: claimError } = await adminClient.rpc(
    "claim_message_email_delivery",
    {
      target_message_id: message.id,
      target_profile_id: target.recipient_profile_id,
    },
  );

  if (claimError) {
    console.error(
      "send-message-email: delivery claim failed",
      claimError.message,
    );
    return "failed";
  }

  const deliveryId = Number(claimedId);
  if (!Number.isSafeInteger(deliveryId) || deliveryId <= 0) {
    return "skipped";
  }

  const messageUrl = `${config.appUrl}/mitteilung/${message.id}`;

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": config.brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: config.senderEmail,
          name: config.senderName,
        },
        to: [{
          email: target.email,
          name: target.display_name,
          contactPixelTrackingConsent: false,
        }],
        subject: "Neue Mitteilung in der Islam-Kinderakademie",
        htmlContent: notificationHtml(
          target.display_name,
          message.subject,
          messageUrl,
        ),
        headers: {
          "Idempotency-Key":
            `academy-message-${message.id}-profile-${target.recipient_profile_id}`,
        },
        tags: ["academy-message"],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = record(await response.json().catch(() => ({})));

    if (!response.ok) {
      throw new Error(`Brevo HTTP ${response.status}`);
    }

    await markDelivery(adminClient, deliveryId, {
      status: "sent",
      sent_at: new Date().toISOString(),
      brevo_message_id: typeof responseBody.messageId === "string"
        ? responseBody.messageId.slice(0, 500)
        : null,
      error_message: null,
    });

    return "sent";
  } catch (reason) {
    const errorMessage = reason instanceof Error
      ? reason.message.slice(0, 500)
      : "Unbekannter Brevo-Fehler";

    console.error("send-message-email: Brevo delivery failed", errorMessage);
    await markDelivery(adminClient, deliveryId, {
      status: "failed",
      error_message: errorMessage,
    });
    return "failed";
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const config = runtimeConfig();
  if (!config) {
    console.error("send-message-email: required environment is missing");
    return jsonResponse(503, { error: "Email service is not configured" });
  }

  const receivedSecret = request.headers.get("x-webhook-secret") ?? "";
  if (!secretsMatch(receivedSecret, config.webhookSecret)) {
    return jsonResponse(401, { error: "Invalid webhook signature" });
  }

  let payload: MessageWebhookPayload | null;
  try {
    payload = parsePayload(await request.json());
  } catch {
    payload = null;
  }

  if (!payload) {
    return jsonResponse(400, { error: "Invalid webhook payload" });
  }

  if (!shouldDispatch(payload)) {
    return jsonResponse(200, { skipped: true });
  }

  const messageId = Number(payload.record.id);
  if (!Number.isSafeInteger(messageId) || messageId <= 0) {
    return jsonResponse(400, { error: "Invalid message id" });
  }

  const adminClient = createAdminClient(config);
  const { data: messageData, error: messageError } = await adminClient
    .from("messages")
    .select("id, subject, published_at")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError) {
    console.error(
      "send-message-email: message lookup failed",
      messageError.message,
    );
    return jsonResponse(500, { error: "Message lookup failed" });
  }

  const messageCandidate = record(messageData);
  const currentPublishedAt = publishedAt(messageCandidate);
  if (
    !Number.isSafeInteger(Number(messageCandidate.id)) ||
    typeof messageCandidate.subject !== "string" ||
    currentPublishedAt === null ||
    currentPublishedAt > Date.now()
  ) {
    return jsonResponse(200, { skipped: true });
  }

  const message: MessageRecord = {
    id: Number(messageCandidate.id),
    subject: messageCandidate.subject.trim().slice(0, 300),
    published_at: messageCandidate.published_at as string,
  };
  const { data: recipientData, error: recipientError } = await adminClient.rpc(
    "list_message_email_recipients",
    { target_message_id: message.id },
  );

  if (recipientError) {
    console.error(
      "send-message-email: recipient lookup failed",
      recipientError.message,
    );
    return jsonResponse(500, { error: "Recipient lookup failed" });
  }

  const recipients = Array.isArray(recipientData)
    ? recipientData.map(recipient).filter((entry): entry is Recipient =>
      entry !== null
    )
    : [];
  const totals = { sent: 0, skipped: 0, failed: 0 };

  for (let index = 0; index < recipients.length; index += SEND_CONCURRENCY) {
    const batch = recipients.slice(index, index + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map((target) =>
        sendToRecipient(adminClient, config, message, target)
      ),
    );

    for (const result of results) totals[result] += 1;
  }

  return jsonResponse(totals.failed > 0 ? 502 : 200, totals);
});
