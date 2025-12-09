import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, type = "login" } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.TAWK_API_KEY

    if (!apiKey) {
      console.error("[TawkHash] TAWK_API_KEY environment variable not set")
      return NextResponse.json(
        { error: "Tawk.to API key not configured" },
        { status: 500 }
      )
    }

    let hash: string
    let message: string

    if (type === "secure") {
      // For secure mode (visitor identification): use EMAIL + API key
      message = email
      console.log(`[TawkHash] Generating secure mode hash for email: ${email}`)
    } else {
      // For login function (conversation retrieval): use userID + API key
      message = userId
      console.log(`[TawkHash] Generating login hash for user: ${userId}`)
    }

    hash = crypto.createHmac("sha256", apiKey).update(message).digest("hex")

    console.log(`[TawkHash] Generated ${type} hash successfully`)

    return NextResponse.json({ hash })
  } catch (error) {
    console.error("[TawkHash] Error generating hash:", error)
    return NextResponse.json(
      { error: "Failed to generate hash" },
      { status: 500 }
    )
  }
}
