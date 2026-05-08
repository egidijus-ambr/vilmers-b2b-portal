export const UI_TYPE = {
  CLASSIC: "classic",
  DRAWER: "drawer",
  DRAWER_WITH_ZOOM: "drawer_with_zoom",
  DRAWER_WIDE: "drawer_wide",
  DRAWER_WITH_ZOOM_WIDE: "drawer_with_zoom_wide",
  HIDDEN: "hidden",
} as const

export const isHidden = (uiType: string | null | undefined): boolean =>
  uiType === UI_TYPE.HIDDEN

export const isWideView = (uiType: string | null | undefined): boolean =>
  !!uiType?.includes("_wide")

export const isZoomEnabled = (uiType: string | null | undefined): boolean =>
  !!uiType?.includes("zoom")
