const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_BACKEND_GRAPHQL",
    description:
      "Your Frontend needs to know where your backend is hosted. This should be the URL of your GraphQL endpoint.",
  },
  {
    key: "NEXT_PUBLIC_BACKEND_REST_API",
    description:
      "Your Frontend needs to know where your backend is hosted. This should be the URL of your REST API endpoint.",
  },
]

// Optional server-only env vars used by the fabric-palette stock-availability
// integration. Feature degrades silently when missing; do not block boot.
// - VILMERS_AX_API_BASE_URL (default: https://furnisys.vilmers.com)
// - VILMERS_AX_API_KEY     (no default; without it the stock check is disabled)

// Optional server-only secret for the backend's trusted-BFF exception
// (src/lib/furnisystems-sdk/client/index.ts sends x-bff-secret + x-client-ip).
// Unset: no BFF headers, so the backend rate-limits every portal user under the
// portal server's IP. The backend ignores values shorter than 32 characters, so
// warn (without blocking boot) when one is set.
const BFF_SECRET_MIN_LENGTH = 32

function checkEnvVariables() {
  const bffSecret = (process.env.BFF_SHARED_SECRET || "").trim()
  if (bffSecret && bffSecret.length < BFF_SECRET_MIN_LENGTH) {
    console.warn(
      c.yellow(
        `\nWarning: BFF_SHARED_SECRET is shorter than ${BFF_SECRET_MIN_LENGTH} characters; the backend will ignore it.\n`
      )
    )
  }

  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    )

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`))
      }
    })

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    )

    process.exit(1)
  }
}

module.exports = checkEnvVariables
