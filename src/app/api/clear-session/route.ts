import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("[Clear Session API] Starting server-side session cleanup...")

    const cookieStore = await cookies()

    // Clear all application-specific httpOnly cookies
    const cookiesToClear = ["_furni_jwt", "_furni_cart_id", "_furni_cache_id"]

    cookiesToClear.forEach((cookieName) => {
      console.log(`[Clear Session API] Clearing cookie: ${cookieName}`)
      cookieStore.set(cookieName, "", {
        maxAge: -1,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
    })

    console.log(
      "[Clear Session API] All server-side cookies cleared successfully"
    )

    return NextResponse.json({
      success: true,
      message: "Server-side session data cleared successfully",
      clearedCookies: cookiesToClear,
    })
  } catch (error) {
    console.error(
      "[Clear Session API] Error clearing server-side session:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message: "Failed to clear server-side session data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
