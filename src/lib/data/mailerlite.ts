import "server-only";

// Shared MailerLite subscribe call, extracted from newsletter.ts so
// email-signup.ts (config-driven `delivery: 'mailerlite'` blocks) can reuse
// the exact same request shape instead of duplicating it.
//
// Deliberately NOT a "use server" file: that directive turns every export
// into a public server action callable directly from any client with no
// validation/gating — an open subscribe endpoint. This is only ever
// imported by the two server actions (newsletter.ts, email-signup.ts) that
// already validate the email themselves; `server-only` just enforces it
// can't accidentally end up in a client bundle.

export interface MailerliteSubscribeResult {
  success: boolean;
  error?: string;
  /**
   * True when MAILERLITE_API_KEY is unset, so the request was never sent —
   * distinct from a real success/failure so each caller can decide what it
   * means for them. newsletter.ts treats it as a lenient local-dev no-op
   * (success); email-signup.ts (an admin-configured, production-facing
   * lead-capture block) treats it as a failure rather than silently
   * discarding the lead.
   */
  skipped?: boolean;
}

const MAILERLITE_BASE_URL = "https://api.mailerlite.com/api/v2";

export async function subscribeToMailerlite(
  email: string
): Promise<MailerliteSubscribeResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    return { success: false, skipped: true };
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
