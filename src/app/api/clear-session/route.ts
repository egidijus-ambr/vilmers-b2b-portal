import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { logoutV1SessionInAction } from "@lib/v1-session/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[Clear Session API] Starting server-side session cleanup...")

    // End the v1 session of this browser too (stage 2c-3, D5: this session
    // only, POST /auth/logout). Always clears both v1 cookies locally, even
    // when the backend is unreachable; never throws on a backend failure.
    try {
      const v1 = await logoutV1SessionInAction()
      if (!v1.acknowledged) {
        console.warn("[Clear Session API] v1 logout not acknowledged by the backend", {
          reason: v1.failure?.reason ?? null,
          status: v1.failure?.status ?? null,
        })
      }
    } catch (error) {
      console.warn(
        "[Clear Session API] v1 logout failed:",
        error instanceof Error ? error.name : "Unknown error"
      )
    }

    const cookieStore = await cookies()

    // Clear all application-specific httpOnly cookies. Same attributes as
    // the writers (src/lib/data/cookies.ts): `_furni_jwt` is SameSite=Lax.
    const cookiesToClear = ["_furni_jwt", "_furni_cart_id", "_furni_cache_id"]

    cookiesToClear.forEach((cookieName) => {
      console.log(`[Clear Session API] Clearing cookie: ${cookieName}`)
      cookieStore.set(cookieName, "", {
        maxAge: -1,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: cookieName === "_furni_jwt" ? "lax" : "strict",
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
