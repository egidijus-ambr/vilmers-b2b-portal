"use server"

export interface NewsletterState {
  success: boolean
  error?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function subscribeNewsletter(
  _currentState: NewsletterState | null,
  formData: FormData
): Promise<NewsletterState> {
  const email = ((formData.get("email") as string) || "").trim()

  if (!email || !EMAIL_REGEX.test(email)) {
    return {
      success: false,
      error: "Please enter a valid email address.",
    }
  }

  const apiUrl = process.env.NEWSLETTER_API_URL

  // When no endpoint is configured, simulate success (no outbound call).
  if (!apiUrl) {
    return { success: true }
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      return {
        success: false,
        error: "Something went wrong. Please try again.",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error subscribing to newsletter:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}
