"use server";

import { subscribeToMailerlite } from "./mailerlite";

export interface NewsletterState {
  success: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletter(
  _currentState: NewsletterState | null,
  formData: FormData
): Promise<NewsletterState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const result = await subscribeToMailerlite(email);

  // No API key configured (e.g. local dev): simulate a successful signup.
  // Lenient on purpose for this hardcoded, non-configurable block — unlike
  // email-signup.ts, there's no admin expectation of real delivery here.
  if (result.skipped) {
    return { success: true };
  }

  return result;
}
