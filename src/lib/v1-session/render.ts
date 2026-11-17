import "server-only"

/**
 * Render-time access to the v1 session (stage 2c-2, DORMANT). Imports only
 * the read path: nothing reachable from here can call the backend, refresh a
 * token or write a cookie, so it is safe in server components. When it
 * returns `needs-refresh`, the render treats the request as unauthenticated
 * on v1; the refresh belongs to middleware / server actions / route handlers
 * (./server.ts, ./middleware-binding.ts).
 */
import { cookies } from "next/headers"
import { readV1Session, type V1SessionRead } from "./read"

export type { V1SessionRead }

export async function getV1SessionForRender(): Promise<V1SessionRead> {
  const store = await cookies()
  return readV1Session({ get: (name) => store.get(name)?.value })
}
