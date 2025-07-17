import { Github } from "@medusajs/icons"
import { Button, Heading } from "@medusajs/ui"
import OutlineButton from "@modules/common/components/outline-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { retrieveCustomer } from "@lib/data/customer"

const Hero = async () => {
  const customer = await retrieveCustomer()
  return (
    <div className="h-screen w-full border-b border-ui-border-base relative bg-ui-bg-subtle -mt-[72px]">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/home_page_background.png')",
        }}
      />

      {/* Overlay for better text readability */}
      <div className="absolute inset-0" />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6 pt-[72px]">
        <span>
          <Heading
            level="h1"
            className="text-6xl font-medium  text-white font-normal drop-shadow-lg "
          >
            Comfort and quality
          </Heading>
          <Heading
            level="h2"
            className="text-6xl font-medium  text-white font-normal drop-shadow-lg leading-[72px]"
          >
            with smart design.
          </Heading>
          <div className="flex items-center justify-center gap-x-4 mt-10">
            <LocalizedClientLink href={customer ? "/account" : "/account"}>
              <OutlineButton showArrow>
                {customer ? "Overview" : "Login"}
              </OutlineButton>
            </LocalizedClientLink>
            \
          </div>
        </span>
        <a
          href="https://github.com/medusajs/nextjs-starter-medusa"
          target="_blank"
        ></a>
      </div>
    </div>
  )
}

export default Hero
