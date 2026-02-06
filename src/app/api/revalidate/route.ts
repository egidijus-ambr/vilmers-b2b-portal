import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  const tag = request.nextUrl.searchParams.get("tag")

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 })
  }

  if (!tag) {
    return NextResponse.json(
      { message: "Missing tag parameter" },
      { status: 400 }
    )
  }

  revalidateTag(tag)
  revalidatePath("/", "layout")

  return NextResponse.json({ revalidated: true, tag })
}
