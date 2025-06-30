# React i18next Setup for Medusa Storefront

This directory contains the complete internationalization (i18n) setup for the Medusa storefront using react-i18next.

## 📁 Structure

```
src/lib/i18n/
├── config.ts                    # i18next configuration
├── provider.tsx                 # React context provider
├── index.ts                     # Main exports
├── README.md                    # This file
├── components/
│   ├── language-switcher.tsx    # Language switcher components
│   └── translation-demo.tsx     # Demo component
└── locales/
    └── en/                      # English translations
        ├── common.json          # Common translations
        ├── navigation.json      # Navigation translations
        ├── product.json         # Product-related translations
        ├── cart.json           # Cart translations
        ├── checkout.json       # Checkout translations
        └── account.json        # Account translations
```

## 🚀 Quick Start

### 1. Basic Usage

```tsx
import { useTranslations } from "@lib/i18n"

function MyComponent() {
  const { t } = useTranslations()

  return (
    <div>
      <h1>{t("navigation:home")}</h1>
      <button>{t("common:save")}</button>
    </div>
  )
}
```

### 2. With Namespace

```tsx
import { useTranslations } from "@lib/i18n"

function ProductCard() {
  const { t } = useTranslations("product")

  return (
    <div>
      <h2>{t("title")}</h2>
      <button>{t("addToCart")}</button>
      <span>{t("inStock")}</span>
    </div>
  )
}
```

### 3. With Interpolation

```tsx
import { useTranslations } from "@lib/i18n"

function CartSummary() {
  const { t } = useTranslations("cart")

  return (
    <div>
      <p>{t("freeShippingThreshold", { amount: "$50" })}</p>
      <p>{t("limitedStock", { count: 3 })}</p>
    </div>
  )
}
```

## 🔧 Components

### Language Switcher

```tsx
import { LanguageSwitcher, CompactLanguageSwitcher } from '@lib/i18n'

// Dropdown version
<LanguageSwitcher />

// Button version
<LanguageSwitcher variant="buttons" />

// Compact version for mobile
<CompactLanguageSwitcher />
```

### Translation Demo

```tsx
import { TranslationDemo } from "@lib/i18n"

// Shows all translation examples
;<TranslationDemo />
```

## 🌍 Supported Languages

- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)

## 📝 Adding New Languages

### 1. Add Language to Config

```typescript
// src/lib/i18n/config.ts
export const supportedLanguages = ["en", "es", "fr", "de", "it", "pt"] as const
```

### 2. Create Translation Files

Create a new directory for your language code:

```
src/lib/i18n/locales/pt/
├── common.json
├── navigation.json
├── product.json
├── cart.json
├── checkout.json
└── account.json
```

### 3. Update Language Switcher

```typescript
// src/lib/i18n/components/language-switcher.tsx
const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português", // Add new language
}

const languageFlags: Record<SupportedLanguage, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹", // Add new flag
}
```

## 🔑 Translation Keys

### Predefined Keys

Use the `TRANSLATION_KEYS` constant for better TypeScript support:

```tsx
import { TRANSLATION_KEYS, useTranslations } from "@lib/i18n"

function MyComponent() {
  const { t } = useTranslations()

  return <button>{t(TRANSLATION_KEYS.COMMON.SAVE)}</button>
}
```

### Available Namespaces

- `common` - General UI elements (save, cancel, loading, etc.)
- `navigation` - Navigation items (home, products, cart, etc.)
- `product` - Product-related content (add to cart, price, stock, etc.)
- `cart` - Shopping cart content (checkout, total, quantity, etc.)
- `checkout` - Checkout process (shipping, payment, billing, etc.)
- `account` - User account content (login, register, profile, etc.)

## 🛠 Utility Functions

### Path Utilities

```tsx
import {
  getLanguageFromPath,
  removeLanguageFromPath,
  addLanguageToPath,
} from "@lib/i18n"

// Extract language from URL path
const lang = getLanguageFromPath("/en/products") // 'en'

// Remove language from path
const cleanPath = removeLanguageFromPath("/en/products") // '/products'

// Add language to path
const localizedPath = addLanguageToPath("/products", "es") // '/es/products'
```

### Server-side Language Detection

```tsx
import { detectLanguageFromHeaders } from "@lib/i18n"

// In a server component or API route
const acceptLanguage = request.headers.get("accept-language")
const detectedLang = detectLanguageFromHeaders(acceptLanguage)
```

## 🎯 Best Practices

### 1. Use Namespaces

Always use namespaces to organize translations:

```tsx
// ✅ Good
t("product:addToCart")

// ❌ Avoid
t("addToCart")
```

### 2. Use Interpolation for Dynamic Content

```tsx
// ✅ Good
t("cart:itemCount", { count: items.length })// ❌ Avoid
`${items.length} items`
```

### 3. Handle Loading States

```tsx
function MyComponent() {
  const { t, isReady } = useTranslations()

  if (!isReady) {
    return <div>Loading...</div>
  }

  return <div>{t("common:welcome")}</div>
}
```

### 4. Use TypeScript Constants

```tsx
import { TRANSLATION_KEYS } from "@lib/i18n"

// ✅ Good - TypeScript support
t(TRANSLATION_KEYS.COMMON.LOADING)

// ❌ Avoid - No TypeScript support
t("common:loading")
```

## 🔍 Debugging

### Enable Debug Mode

Set `NODE_ENV=development` to see i18next debug logs in the console.

### Check Translation Loading

```tsx
function DebugComponent() {
  const { language, isReady, isLoading } = useTranslations()

  return (
    <div>
      <p>Language: {language}</p>
      <p>Ready: {isReady ? "Yes" : "No"}</p>
      <p>Loading: {isLoading ? "Yes" : "No"}</p>
    </div>
  )
}
```

## 📱 Integration with Next.js

The i18n setup is already integrated with:

- ✅ App Router
- ✅ Server Components (via provider)
- ✅ Client Components
- ✅ Dynamic imports for translations
- ✅ Language detection
- ✅ Local storage persistence

## 🚨 Common Issues

### 1. Translations Not Loading

Make sure the I18nProvider wraps your app:

```tsx
// src/app/layout.tsx
import { I18nProvider } from "@lib/i18n"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
```

### 2. Missing Translation Keys

Check the browser console for missing key warnings when `NODE_ENV=development`.

### 3. Language Not Persisting

The language preference is stored in localStorage. Make sure you're not clearing it.

## 📚 Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [Next.js Internationalization](https://nextjs.org/docs/advanced-features/i18n)
