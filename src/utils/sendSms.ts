export async function sendSms(to: string, content: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SMS_SENDER;

  if (!apiKey || !sender) {
    throw new Error("Brevo SMS configuration is incomplete");
  }

  const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      recipient: to.replace(/^\+/, ""),
      content,
      type: "transactional",
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo SMS request failed with status ${response.status}`);
  }
}
