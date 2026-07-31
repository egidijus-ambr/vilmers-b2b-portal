import { Text } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import { getServerT } from "@lib/i18n/server-translations"
import { SupportedLanguage } from "@lib/i18n"
import { ShopSetting } from "@lib/furnisystems-sdk"
import type { FooterColumn } from "@lib/furnisystems-sdk/modules/shop-settings/types"
import {
  resolveCtaHrefRelative,
  toCtaLike,
} from "@modules/home/components/content-block/linkResolver"
import { resolveProfileValue } from "@modules/fabric-palettes/utils/fabric-profile-helpers"
import { activeTheme } from "themes"

interface FooterProps {
  language: SupportedLanguage
  shopSettings?: ShopSetting | null
}

/** A footer link renders only when its config value is a non-empty, non-whitespace string. */
const show = (v?: string | null) => Boolean(v && v.trim())

export default async function Footer({ language, shopSettings }: FooterProps) {
  const t = await getServerT("common", language)

  const brandName =
    shopSettings?.default_manufacturer?.company_name || "Vilmers"
  const copyrightText =
    shopSettings?.footer_copyright_text ||
    `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`

  const footer = activeTheme.layout.footer

  // Per-field fallback: the DB value (admin-authored) wins; the theme value
  // covers brands that haven't been migrated to admin-managed socials yet.
  // `hasAnySocial` is recomputed from these resolved values (not `footer`
  // directly) so the empty-DB fallback still renders identically to today.
  const social = {
    facebook: shopSettings?.facebook || footer?.facebook,
    twitter: shopSettings?.twitter || footer?.twitter,
    instagram: shopSettings?.instagram || footer?.instagram,
    pinterest: shopSettings?.pinterest || footer?.pinterest,
    linkedin: shopSettings?.linkedin || footer?.linkedin,
  }

  const hasAnySocial =
    show(social.facebook) ||
    show(social.twitter) ||
    show(social.instagram) ||
    show(social.pinterest) ||
    show(social.linkedin)

  const footerColumns: FooterColumn[] = shopSettings?.footer_columns ?? []
  const hasContactInfo =
    show(shopSettings?.footer_address) ||
    show(shopSettings?.footer_phone) ||
    show(shopSettings?.footer_email)

  const variant = footer?.variant ?? "full"

  if (variant === "compact") {
    return (
      <footer className="bg-footer-background w-full">
        <div className="content-container flex w-full px-10">
          <div className="flex flex-col gap-y-3 py-6 w-full">
            <div className="flex flex-col gap-y-3 xsmall:flex-row items-center justify-between">
              {show(footer?.footer_support_email) && (
                <div className="flex items-center gap-2">
                  <Text className="text-footer-foreground text-2xl">
                    {t("how-can-we-help")}{" "}
                    <a
                      href={`mailto:${footer?.footer_support_email}`}
                      className="underline hover:no-underline"
                    >
                      {t("contact-us")}
                    </a>
                  </Text>
                </div>
              )}

              {hasAnySocial && (
                <div className="flex items-center gap-6">
                  {/* Facebook */}
                  {show(social.facebook) && (
                    <a
                      href={social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-footer-foreground hover:text-gray-300 transition-colors"
                      aria-label="Facebook"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}

                  {/* X (Twitter) */}
                  {show(social.twitter) && (
                    <a
                      href={social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-footer-foreground hover:text-gray-300 transition-colors"
                      aria-label="X (Twitter)"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}

                  {/* LinkedIn */}
                  {show(social.linkedin) && (
                    <a
                      href={social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-footer-foreground hover:text-gray-300 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  )}

                  {/* Instagram */}
                  {show(social.instagram) && (
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-footer-foreground hover:text-gray-300 transition-colors"
                      aria-label="Instagram"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}

                  {/* Pinterest */}
                  {show(social.pinterest) && (
                    <a
                      href={social.pinterest}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-footer-foreground hover:text-gray-300 transition-colors"
                      aria-label="Pinterest"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.895 2.741a.36.36 0 0 1 .083.345l-.333 1.36c-.053.222-.174.269-.402.163-1.499-.698-2.436-2.891-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.607 0 11.985 0h.032z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-footer-foreground/80">{copyrightText}</p>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-footer-background w-full">
      <div className="content-container flex flex-col w-full px-10">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-center justify-between py-24  ">
          {show(footer?.footer_support_email) && (
            <div className="flex items-center gap-2">
              <Text className="text-footer-foreground text-2xl">
                {t("how-can-we-help")}{" "}
                <a
                  href={`mailto:${footer?.footer_support_email}`}
                  className="underline hover:no-underline"
                >
                  {t("contact-us")}
                </a>
              </Text>
            </div>
          )}

          {hasAnySocial && (
            <div className="flex items-center gap-6">
              {/* Facebook */}
              {show(social.facebook) && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-foreground hover:text-gray-300 transition-colors"
                  aria-label="Facebook"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}

              {/* X (Twitter) */}
              {show(social.twitter) && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-foreground hover:text-gray-300 transition-colors"
                  aria-label="X (Twitter)"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}

              {/* LinkedIn */}
              {show(social.linkedin) && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-foreground hover:text-gray-300 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}

              {/* Instagram */}
              {show(social.instagram) && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-foreground hover:text-gray-300 transition-colors"
                  aria-label="Instagram"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}

              {/* Pinterest */}
              {show(social.pinterest) && (
                <a
                  href={social.pinterest}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-foreground hover:text-gray-300 transition-colors"
                  aria-label="Pinterest"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.895 2.741a.36.36 0 0 1 .083.345l-.333 1.36c-.053.222-.174.269-.402.163-1.499-.698-2.436-2.891-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.607 0 11.985 0h.032z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-gray-600 w-full"></div>
        {(footerColumns.length > 0 || hasContactInfo) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-8 py-12">
            {footerColumns.map((column) => (
              <div key={column.id} className="flex flex-col gap-y-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-footer-foreground">
                  {resolveProfileValue(
                    column.footer_column_profiles,
                    language,
                    (p) => p.heading
                  )}
                </span>
                <ul className="grid grid-cols-1 gap-y-2">
                  {column.footer_links.map((link) => (
                    <li key={link.id}>
                      <LocalizedClientLink
                        href={resolveCtaHrefRelative(toCtaLike(link), language)}
                        target={link.link_new_tab ? "_blank" : undefined}
                        rel={link.link_new_tab ? "noopener noreferrer" : undefined}
                        className="text-sm text-footer-foreground/80 hover:text-footer-foreground transition-colors"
                      >
                        {resolveProfileValue(
                          link.footer_link_profiles,
                          language,
                          (p) => p.label
                        )}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {hasContactInfo && (
              <div className="flex flex-col gap-y-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-footer-foreground">
                  {t("contacts")}
                </span>
                <div className="flex flex-col gap-y-2 text-sm text-footer-foreground/80">
                  {show(shopSettings?.footer_address) && (
                    <p className="whitespace-pre-line">
                      {shopSettings?.footer_address}
                    </p>
                  )}
                  {show(shopSettings?.footer_phone) && (
                    <a
                      href={`tel:${shopSettings?.footer_phone}`}
                      className="hover:text-footer-foreground transition-colors"
                    >
                      {shopSettings?.footer_phone}
                    </a>
                  )}
                  {show(shopSettings?.footer_email) && (
                    <a
                      href={`mailto:${shopSettings?.footer_email}`}
                      className="hover:text-footer-foreground transition-colors"
                    >
                      {shopSettings?.footer_email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex w-full mb-4 justify-between text-footer-foreground/80">
          <Text className="txt-compact-small">{copyrightText}</Text>
          {show(footer?.footer_privacy_url) && (
            <LocalizedClientLink
              href={footer!.footer_privacy_url!}
              className="txt-compact-small hover:text-footer-foreground transition-colors"
            >
              {t("privacy-policy")}
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </footer>
  )
}
