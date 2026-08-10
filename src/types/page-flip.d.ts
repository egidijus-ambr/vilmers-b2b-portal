// The installed `page-flip@2.0.7` package (StPageFlip) ships no `.d.ts`
// declaration files and has no `types`/`typings` field in its package.json —
// only compiled JS under `dist/js/`. This ambient module covers the subset
// of the API this app uses, derived from the package's own `src/*.ts`
// (PageFlip.ts, Settings.ts, Event/EventObject.ts).
declare module "page-flip" {
  export interface WidgetEvent {
    data: number | string | boolean | object
    object: PageFlip
  }

  export type EventCallback = (e: WidgetEvent) => void

  export interface FlipSetting {
    startPage: number
    size: "fixed" | "stretch"
    width: number
    height: number
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
    drawShadow: boolean
    flippingTime: number
    usePortrait: boolean
    startZIndex: number
    autoSize: boolean
    maxShadowOpacity: number
    showCover: boolean
    mobileScrollSupport: boolean
    clickEventForward: boolean
    useMouseEvents: boolean
    swipeDistance: number
    showPageCorners: boolean
    disableFlipByClick: boolean
  }

  export class PageFlip {
    constructor(inBlock: HTMLElement, setting: Partial<FlipSetting>)
    destroy(): void
    update(): void
    loadFromImages(imagesHref: string[]): void
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    flipNext(corner?: "top" | "bottom"): void
    flipPrev(corner?: "top" | "bottom"): void
    on(eventName: string, callback: EventCallback): PageFlip
    off(eventName: string): void
  }
}
