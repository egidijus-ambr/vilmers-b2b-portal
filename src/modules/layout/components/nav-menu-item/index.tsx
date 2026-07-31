"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  DropdownContainer,
  DropdownTrigger,
  DropdownList,
  DropdownListItem,
} from "@modules/common/components/dropdown-menu"
import MegaMenuPanel from "@modules/layout/components/mega-menu-panel"

export interface MegaMenuLink {
  label: string
  href: string | null
}

export interface MegaMenuColumn {
  /** Always set by current producers; kept optional for callers that may not have one. */
  heading?: string | null
  href: string | null
  /** May be empty (e.g. a page-sourced column whose child page has no children of its own) — the column then renders as a bare clickable heading. */
  links: MegaMenuLink[]
}

export interface MegaMenuFeaturedCard {
  title: string
  label?: string | null
  imageSrc?: string | null
  href: string | null
  newTab?: boolean
}

export interface MenuItem {
  id: string
  label: string
  type: "link" | "dropdown"
  href: string | null
  /**
   * True for the item that should survive the logo-left (Dominari) trim to
   * "store only" — set on the legacy `id === "store"` item OR, for DB-driven
   * items, on whichever item has `link_type === "store"`. Filtering on this
   * flag (instead of `id`) is what lets DB-authored nav items survive that
   * trim; see `nav/index.tsx`.
   */
  isStoreLink?: boolean
  /**
   * Opens `href` in a new tab. Mainly meaningful for `type: "link"` items
   * (e.g. a DB external_url), but also consulted by the `type: "dropdown"`
   * trigger's own click-to-external-href handling below (see NavMenuItem) —
   * currently a no-op there since `buildNavigationFromSettings` never sets
   * it for `mega_menu` items, but the handler still respects it in case
   * that changes.
   */
  newTab?: boolean
  dropdown?: {
    width: string
    /** "mega-panel" renders `columns`/`featuredCard` via MegaMenuPanel instead of the flat DropdownList. */
    layout: "single-column" | "mega-panel"
    /** Always present (possibly empty) so existing single-column consumers (e.g. mobile-menu) don't need extra null-checks. */
    items: DropdownItem[]
    columns?: MegaMenuColumn[]
    featuredCard?: MegaMenuFeaturedCard | null
  }
}

export interface DropdownItem extends DropdownListItem {}
export interface SubmenuItem extends DropdownListItem {}
export interface SubSubmenuItem extends DropdownListItem {}

interface NavMenuItemProps {
  item: MenuItem
  isHomePage: boolean
  activeDropdown: string | null
  activeSubmenu: string | null
  activeSubSubmenu: string | null
  onDropdownEnter: (itemId: string) => void
  onDropdownLeave: () => void
  onSubmenuEnter: (itemLabel: string) => void
  onSubmenuLeave: () => void
  onSubSubmenuEnter: (itemLabel: string) => void
  onSubSubmenuLeave: () => void
  triggerClassName?: string
}

export default function NavMenuItem({
  item,
  isHomePage,
  activeDropdown,
  activeSubmenu,
  activeSubSubmenu,
  onDropdownEnter,
  onDropdownLeave,
  onSubmenuEnter,
  onSubmenuLeave,
  onSubSubmenuEnter,
  onSubSubmenuLeave,
  triggerClassName,
}: NavMenuItemProps) {
  const router = useRouter()
  const { languageCode } = useParams() as { languageCode: string }

  if (item.type === "link") {
    return (
      <LocalizedClientLink
        href={item.href}
        target={item.newTab ? "_blank" : undefined}
        rel={item.newTab ? "noopener noreferrer" : undefined}
        className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
          isHomePage
            ? "text-white hover:text-gray-200"
            : "text-ui-fg-subtle hover:text-ui-fg-base"
        }`}
      >
        {item.label}
      </LocalizedClientLink>
    )
  }

  if (item.type === "dropdown" && item.dropdown) {
    const isMega = item.dropdown.layout === "mega-panel"

    return (
      <div
        // The mega-panel variant intentionally omits `position: relative`
        // here: DropdownContainer's `position="mega"` positions itself
        // `absolute` against the nearest positioned ancestor, which — with
        // no `relative` on this wrapper — is the full-width `<header>` in
        // nav/index.tsx, not this small trigger wrapper. That's what lets a
        // full-bleed panel render correctly regardless of where the
        // trigger sits (center cluster or right cluster under logo-left).
        // Single-column dropdowns keep `relative` (unchanged).
        className={isMega ? undefined : "relative"}
        onMouseEnter={() => onDropdownEnter(item.id)}
        onMouseLeave={onDropdownLeave}
      >
        <DropdownTrigger
          isOpen={activeDropdown === item.id}
          onClick={
            item.href
              ? () => {
                  const href = item.href!
                  // Mirror LocalizedClientLink's own isExternal check (see
                  // localized-client-link/index.tsx) so an admin-configured
                  // external self-link on this item resolves the same way
                  // here as it would through that component: only relative
                  // hrefs get the `/${languageCode}` prefix + router.push.
                  const isExternal =
                    href.startsWith("http://") || href.startsWith("https://")
                  if (isExternal) {
                    if (item.newTab) {
                      window.open(href, "_blank", "noopener,noreferrer")
                    } else {
                      window.location.assign(href)
                    }
                  } else {
                    router.push(`/${languageCode}${href}`)
                  }
                }
              : undefined
          }
          className={
            triggerClassName ||
            `h-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
              isHomePage
                ? "text-white hover:text-gray-200"
                : "text-ui-fg-subtle hover:text-ui-fg-base"
            }`
          }
        >
          <span>{item.label}</span>
        </DropdownTrigger>

        {/* Hover-gap bridge (single-column only): `DropdownContainer`'s
            "left" position starts its panel at `top-full mt-1` — a small
            but real gap between this wrapper's own box (== the trigger,
            since this div isn't stretched to the nav's full height) and
            the panel below it. Slowly crossing that literal gap resolves
            to whatever's rendered underneath (not a descendant of this
            wrapper), which fires `mouseleave` early. This invisible strip
            is a DOM descendant of the same `relative` wrapper and sized to
            more than cover the `mt-1` (4px) margin, so the hoverable
            region is contiguous from trigger to panel with no reliance on
            the close-delay grace period. Scoped to `w-full` of THIS
            wrapper (trigger-width), not the header, so it can't steal
            hover from sibling nav items. Mega's panel starts at the
            header's own bottom edge (this wrapper deliberately isn't
            `relative` there — see above), so an equivalently-scoped bridge
            isn't possible here; that gap is covered only by the close
            delay in NavMenu, not geometrically. */}
        {!isMega && (
          <div aria-hidden="true" className="absolute inset-x-0 top-full h-2" />
        )}

        <DropdownContainer
          isOpen={activeDropdown === item.id}
          width={item.dropdown.width}
          position={isMega ? "mega" : "left"}
        >
          {isMega ? (
            <MegaMenuPanel
              columns={item.dropdown.columns ?? []}
              featuredCard={item.dropdown.featuredCard}
            />
          ) : (
            <DropdownList
              items={item.dropdown.items}
              activeSubmenu={activeSubmenu}
              activeSubSubmenu={activeSubSubmenu}
              onSubmenuEnter={onSubmenuEnter}
              onSubmenuLeave={onSubmenuLeave}
              onSubSubmenuEnter={onSubSubmenuEnter}
              onSubSubmenuLeave={onSubSubmenuLeave}
              spacing="spacious"
            />
          )}
        </DropdownContainer>
      </div>
    )
  }

  return null
}
