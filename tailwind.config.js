const path = require("path")

module.exports = {
  darkMode: "class",
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@medusajs/ui/dist/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        width: "width margin",
        height: "height",
        bg: "background-color",
        display: "display opacity",
        visibility: "visibility",
        padding: "padding-top padding-right padding-bottom padding-left",
      },
      colors: {
        // Channel form (`rgb(var(--color-x) / <alpha-value>)`) is required
        // for Tailwind opacity modifiers (`bg-gold/10`, `text-white/80`,
        // `hover:bg-accent/90`, …) to work: `src/themes/index.ts`
        // (`themeToCssVars`) emits hex-derived tokens as raw RGB channels
        // (e.g. `--color-gold: 154 133 85`), and this wrapper combines them
        // with Tailwind's injected alpha. A bare `var(--color-*)` full-color
        // reference silently DROPS the alpha modifier instead (Tailwind
        // can't parse channels out of a full color value).
        //
        // `primary` is a redundant alias for `dark-blue` (both were
        // `#222D37`) — collapsed to resolve to the same CSS variable so
        // `bg-primary`/`text-primary` usages keep working with zero
        // per-file edits, without emitting a separate `--color-primary` var.
        // See src/themes/vilmers.ts and src/themes/index.ts (themeToCssVars).
        primary: "rgb(var(--color-dark-blue) / <alpha-value>)",
        // Figma Design System Colors
        "dark-blue": "rgb(var(--color-dark-blue) / <alpha-value>)",
        "dark-blue-70": "rgb(var(--color-dark-blue-70) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        "gold-10": "rgb(var(--color-gold-10) / <alpha-value>)",
        "gold-20": "rgb(var(--color-gold-20) / <alpha-value>)",
        "gold-30": "rgb(var(--color-gold-30) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        beige: "rgb(var(--color-beige) / <alpha-value>)",
        "beige-20": "rgb(var(--color-beige-20) / <alpha-value>)",
        white: "rgb(var(--color-white) / <alpha-value>)",
        sale: "rgb(var(--color-sale) / <alpha-value>)",
        // Already-`rgba()` tokens — full value, referenced bare (never used
        // with an opacity modifier; wrapping them in `rgb(... / a)` would be
        // invalid CSS since their value is itself `rgba(...)`, not channels).
        divider: "var(--color-divider)",
        "image-overlay": "var(--color-image-overlay)",
        "beige-80": "rgb(var(--color-beige-80) / <alpha-value>)",
        "white-20": "var(--color-white-20)",
        "white-80": "var(--color-white-80)",
        "beige-10": "rgb(var(--color-beige-10) / <alpha-value>)",
        "gray-inactive": "rgb(var(--color-gray-inactive) / <alpha-value>)",
        // Status Colors
        "status-completed": "rgb(var(--color-status-completed) / <alpha-value>)",
        "status-awaiting-payment":
          "rgb(var(--color-status-awaiting-payment) / <alpha-value>)",
        "status-pending": "rgb(var(--color-status-pending) / <alpha-value>)",
        "status-shipping": "rgb(var(--color-status-shipping) / <alpha-value>)",
        "status-canceled": "rgb(var(--color-status-canceled) / <alpha-value>)",
        "status-paid": "rgb(var(--color-status-paid) / <alpha-value>)",
        "status-delivered": "rgb(var(--color-status-delivered) / <alpha-value>)",
        // Legacy colors (keeping for backward compatibility)
        grey: {
          0: "rgb(var(--color-grey-0) / <alpha-value>)",
          5: "rgb(var(--color-grey-5) / <alpha-value>)",
          10: "rgb(var(--color-grey-10) / <alpha-value>)",
          20: "rgb(var(--color-grey-20) / <alpha-value>)",
          30: "rgb(var(--color-grey-30) / <alpha-value>)",
          40: "rgb(var(--color-grey-40) / <alpha-value>)",
          50: "rgb(var(--color-grey-50) / <alpha-value>)",
          60: "rgb(var(--color-grey-60) / <alpha-value>)",
          70: "rgb(var(--color-grey-70) / <alpha-value>)",
          80: "rgb(var(--color-grey-80) / <alpha-value>)",
          90: "rgb(var(--color-grey-90) / <alpha-value>)",
        },
        // Layer 4 — semantic surface tokens (role-based tier on top of the
        // primitives above). Additive: primitives keep working unchanged.
        // Each defaults to a primitive via `--<token>: var(--color-<key>)`
        // (see src/themes/vilmers.ts + src/themes/index.ts), inheriting that
        // primitive's channels, so the channel wrapper applies here too and
        // this is a visual no-op until a brand overrides a role in its preset.
        "page-background": "rgb(var(--page-background) / <alpha-value>)",
        "page-foreground": "rgb(var(--page-foreground) / <alpha-value>)",
        "top-menu-background":
          "rgb(var(--top-menu-background) / <alpha-value>)",
        "top-menu-foreground":
          "rgb(var(--top-menu-foreground) / <alpha-value>)",
        "nav-background": "rgb(var(--nav-background) / <alpha-value>)",
        "nav-foreground": "rgb(var(--nav-foreground) / <alpha-value>)",
        "product-card-background":
          "rgb(var(--product-card-background) / <alpha-value>)",
        "footer-background": "rgb(var(--footer-background) / <alpha-value>)",
        "footer-foreground": "rgb(var(--footer-foreground) / <alpha-value>)",
        "hero-background": "rgb(var(--hero-background) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        // Sofa configurator surfaces — see
        // docs/superpowers/specs/2026-07-13-configurator-theme-tokens-design.md
        "configurator-surface":
          "rgb(var(--configurator-surface) / <alpha-value>)",
        "configurator-card": "rgb(var(--configurator-card) / <alpha-value>)",
        "configurator-accent":
          "rgb(var(--configurator-accent) / <alpha-value>)",
        "configurator-accent-hover":
          "rgb(var(--configurator-accent-hover) / <alpha-value>)",
        "configurator-accent-foreground":
          "rgb(var(--configurator-accent-foreground) / <alpha-value>)",
      },
      borderRadius: {
        none: "0px",
        soft: "2px",
        base: "4px",
        rounded: "8px",
        large: "16px",
        circle: "9999px",
      },
      maxWidth: {
        "8xl": "100rem",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      fontSize: {
        "3xl": "2rem",
      },
      fontFamily: {
        sans: [
          "var(--font-brand)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Ubuntu",
          "sans-serif",
        ],
      },
      keyframes: {
        ring: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-top": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out-top": {
          "0%": {
            height: "100%",
          },
          "99%": {
            height: "0",
          },
          "100%": {
            visibility: "hidden",
          },
        },
        "accordion-slide-up": {
          "0%": {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          "100%": {
            height: "0",
            opacity: "0",
          },
        },
        "accordion-slide-down": {
          "0%": {
            "min-height": "0",
            "max-height": "0",
            opacity: "0",
          },
          "100%": {
            "min-height": "var(--radix-accordion-content-height)",
            "max-height": "none",
            opacity: "1",
          },
        },
        enter: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        ring: "ring 2.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        "fade-in-right":
          "fade-in-right 0.3s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-in-top": "fade-in-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-out-top":
          "fade-out-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "accordion-open":
          "accordion-slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        "accordion-close":
          "accordion-slide-up 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        enter: "enter 200ms ease-out",
        "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
        leave: "leave 150ms ease-in forwards",
      },
    },
  },
  plugins: [
    require("tailwindcss-radix")(),
    require("@tailwindcss/typography"),
  ],
}
