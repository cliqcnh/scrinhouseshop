/**
 * Normalizes Ghanaian phone numbers to international format (233XXXXXXXXX).
 * Handles: +23324..., 23324..., 024..., 24...
 */
export function normalizePhoneNumber(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, "");
  
  if (clean.startsWith("+")) {
    return clean.slice(1);
  }
  if (clean.startsWith("233")) {
    return clean;
  }
  if (clean.startsWith("0")) {
    return "233" + clean.slice(1);
  }
  // Fallback prefix if it looks like a 9 digit local number
  if (clean.length === 9) {
    return "233" + clean;
  }
  return clean;
}

/**
 * Sends SMS via Wigal Frog SMS API Gateway (Ghana) or Arkesel SMS API.
 * If no SMS keys are configured, outputs to system logs.
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  const wigalApiKey = process.env.WIGAL_API_KEY;
  const wigalUsername = process.env.WIGAL_USERNAME;
  const wigalPassword = process.env.WIGAL_PASSWORD;
  const arkeselApiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || "ScrinHouse";
  const normalizedTo = normalizePhoneNumber(to);

  // If no SMS gateway keys configured, mock log to console
  if (!wigalApiKey && !wigalUsername && !arkeselApiKey) {
    console.log(`[MOCK SMS] To: ${normalizedTo} | Sender: ${senderId}\nMessage: "${message}"\n`);
    return true;
  }

  try {
    // 1. Wigal Frog Gateway Integration (Ghana)
    if (wigalApiKey || (wigalUsername && wigalPassword)) {
      const endpoint = process.env.WIGAL_SMS_URL || "https://sms.wigal.com.gh/api/v2/send_sms";
      const payload = wigalApiKey
        ? {
            key: wigalApiKey,
            sender: senderId,
            destinations: [normalizedTo],
            to: normalizedTo,
            message,
          }
        : {
            username: wigalUsername,
            password: wigalPassword,
            sender: senderId,
            destinations: [normalizedTo],
            to: normalizedTo,
            message,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(wigalApiKey ? { "Authorization": `Bearer ${wigalApiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Wigal SMS delivery error: HTTP ${res.status} - ${errText}`);
        return false;
      }
      return true;
    }

    // 2. Arkesel Gateway Integration Fallback
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": arkeselApiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients: [normalizedTo],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Arkesel SMS delivery error: HTTP ${res.status} - ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("SMS notification exception:", err);
    return false;
  }
}

/**
 * Sends Email via Resend API.
 * If RESEND_API_KEY is not defined, outputs to system logs.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ScrinHouse <no-reply@scrinhouse.com>";

  if (!apiKey) {
    console.log(`[MOCK EMAIL] From: ${from} | To: ${to}\nSubject: "${subject}"\nHtml Body:\n${html}\n`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend email delivery error: HTTP ${res.status} - ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email notification exception:", err);
    return false;
  }
}
