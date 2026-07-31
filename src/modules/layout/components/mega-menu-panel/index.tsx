"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type {
  MegaMenuColumn,
  MegaMenuFeaturedCard,
} from "@modules/layout/components/nav-menu-item"
import { activeTheme } from "themes"

interface MegaMenuPanelProps {
  columns: MegaMenuColumn[]
  featuredCard?: MegaMenuFeaturedCard | null
}

/**
 * Desktop-only left offset so the first column's left edge lines up with
 * the nav trigger LABEL's left edge, not the panel's own `max-w-9xl px-6`
 * container edge (see DropdownContainer's "mega" position + nav/index.tsx).
 * Two constant terms, both taken from the classes that actually produce
 * them (not measured/guessed pixels):
 *  - `px-4` (16px): DropdownTrigger's default className, inset before the
 *    `<span>{item.label}</span>` — see nav-menu-item.tsx. No `NavMenu`
 *    caller overrides `triggerClassName`, so this is a true site constant.
 *  - `mr-3` (12px): the Back button's own wrapper margin in nav/index.tsx,
 *    present only when `logo.position === "center"` (Back button sits
 *    ahead of the nav menu in that left-packed cluster) AND
 *    `backButton.show`.
 * This aligns to the Back-button-ABSENT steady state (home page, or any
 * page before browser history exists) since the button's rendered width
 * (0 vs ~32px) is a client-only, per-page runtime value, not a class — see
 * back-button/index.tsx. On pages where the arrow renders, the panel sits
 * one arrow-width left of the label; that residual is accepted rather than
 * chasing a moving target.
 * Intentionally a no-op under `logo.position === "left"` (Dominari): there
 * the nav menu is the first child of a `justify-end` right cluster, so the
 * label's x-position shifts with cart-count/login-state/switcher width and
 * isn't a fixed offset from any container edge — not solved here.
 */
const columnsOffsetClass =
  activeTheme.layout.logo.position === "center"
    ? activeTheme.layout.backButton.show
      ? "small:ml-7" // px-4 (16px) + mr-3 (12px)
      : "small:ml-4" // px-4 (16px) only
    : ""

/**
 * Renders inside DropdownContainer's "mega" variant: a full-bleed white
 * panel whose content is width-constrained to match the nav's own
 * `max-w-9xl` container, so it aligns with the logo/nav edges regardless of
 * which item triggered it. Columns of category links on the left, an
 * optional featured image card on the right.
 */
export default function MegaMenuPanel({
  columns,
  featuredCard,
}: MegaMenuPanelProps) {
  if (columns.length === 0 && !featuredCard) return null

  return (
    <div className="max-w-9xl mx-auto px-6 py-10">
      <div className="flex justify-between gap-12">
        {columns.length > 0 && (
          <div className={`flex flex-wrap gap-x-24 gap-y-8 ${columnsOffsetClass}`}>
            {columns.map((column, index) => (
              <div key={index}>
                {column.heading && (
                  <LocalizedClientLink
                    href={column.href}
                    className={`block text-xs font-semibold uppercase tracking-wide text-ui-fg-base hover:text-ui-fg-interactive transition-colors ${
                      column.links.length > 0 ? "mb-4" : ""
                    }`}
                  >
                    {column.heading}
                  </LocalizedClientLink>
                )}
                {column.links.length > 0 && (
                  <ul className="space-y-3">
                    {column.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <LocalizedClientLink
                          href={link.href}
                          className="block text-sm text-ui-fg-subtle hover:text-ui-fg-base transition-colors"
                        >
                          {link.label}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {featuredCard && (
          <LocalizedClientLink
            href={featuredCard.href}
            target={featuredCard.newTab ? "_blank" : undefined}
            rel={featuredCard.newTab ? "noopener noreferrer" : undefined}
            className="hidden small:block small:w-[380px] medium:w-[440px] large:w-[500px] flex-shrink-0 mr-16 medium:mr-20 large:mr-24 xlarge:mr-28 group"
          >
            {featuredCard.imageSrc && (
              <div className="w-full aspect-[16/9] overflow-hidden bg-ui-bg-subtle mb-3">
                <img
                  src={featuredCard.imageSrc}
                  alt={featuredCard.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </div>
            )}
            <p className="text-sm font-semibold text-ui-fg-base">
              {featuredCard.title}
            </p>
            {featuredCard.label && (
              <p className="text-xs italic text-ui-fg-subtle mt-1">
                {featuredCard.label}
              </p>
            )}
          </LocalizedClientLink>
        )}
      </div>
    </div>
  )
}
