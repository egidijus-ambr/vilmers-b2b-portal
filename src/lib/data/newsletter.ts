"use server";

export interface NewsletterState {
  success: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAILERLITE_BASE_URL = "https://api.mailerlite.com/api/v2";

export async function subscribeNewsletter(
  _currentState: NewsletterState | null,
  formData: FormData
): Promise<NewsletterState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const apiKey = process.env.MAILERLITE_API_KEY;

  // No API key configured (e.g. local dev): simulate a successful signup.
  if (!apiKey) {
    return { success: true };
  }

  const groupId = process.env.MAILERLITE_GROUP_ID?.trim();
  const endpoint = groupId
    ? `${MAILERLITE_BASE_URL}/groups/${groupId}/subscribers`
    : `${MAILERLITE_BASE_URL}/subscribers`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-MailerLite-ApiKey": apiKey,
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      return { success: false, error: "Something went wrong. Please try again." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
