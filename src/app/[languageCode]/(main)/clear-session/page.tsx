import { Metadata } from "next"
import ClearSessionTemplate from "../../../../modules/account/templates/clear-session-template"

export const metadata: Metadata = {
  title: "Clear Session | Furni Systems",
  description: "Clear all session data and stored information",
}

export default function ClearSessionPage() {
  return <ClearSessionTemplate />
}
