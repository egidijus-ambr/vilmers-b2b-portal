import React from 'react'

/**
 * Legacy shape aliases. CORNERL / CORNERR drawings were removed; stored data
 * (modules, composites, old orders/carts) may still say CORNERL / CORNERR and
 * must keep drawing identically, so every shape lookup goes through here.
 */
export const LEGACY_SHAPE_ALIASES: Record<string, string> = {
  CORNERL: 'CORNERCUTL',
  CORNERR: 'CORNERCUTR',
}

export const resolveShapeType = (type: string): string =>
  (type && LEGACY_SHAPE_ALIASES[type]) || type

export const isAliasedShape = (type: string): boolean =>
  !!type && type in LEGACY_SHAPE_ALIASES

const wrapperCache = new Map<string, React.ComponentType<any>>()

/**
 * Wraps the target drawing of an aliased legacy type. Legacy corners had no
 * cut, so with a null corner_part_length the cut length defaults to
 * min(width, height): the outline is the full rectangle even for W > H
 * (the CORNERCUT* fallback would otherwise cut when width > height).
 */
export const withLegacyShapeAlias = (
  legacyType: string,
  Component: React.ComponentType<any>
): React.ComponentType<any> => {
  const key = `${legacyType}:${(Component as any).displayName || Component.name}`
  const cached = wrapperCache.get(key)
  if (cached) return cached
  const Wrapped = (props: any) => (
    <Component
      {...props}
      cornerPartLength={
        props.cornerPartLength ?? Math.min(props.width, props.height)
      }
    />
  )
  Wrapped.displayName = `LegacyAlias(${legacyType})`
  wrapperCache.set(key, Wrapped)
  return Wrapped
}

/** Resolves a drawing component by (possibly legacy) type from a name->component map. */
export const getShapeComponent = (
  elements: Record<string, any>,
  type: string
): React.ComponentType<any> | undefined => {
  const Component = elements[resolveShapeType(type)]
  if (!Component) return undefined
  return isAliasedShape(type) ? withLegacyShapeAlias(type, Component) : Component
}

/**
 * Hidden from shape pickers. Existing rows with one of these values still
 * display it (pickers add the current value back).
 * Deprecated enum values mirror `// Deprecated` in backend prisma schema.
 */
export const LEGACY_SHAPES: string[] = [
  'CORNERL',
  'CORNERR',
  'SQUARESQAA',
  'EMANYPILLOW',
  // `// Deprecated` enum values in backend prisma schema
  'ARCHCORNERR',
  'LCHRROUNDEDL',
  'LCHRROUNDEDR',
  'LCHOUTERROUNDEDL',
  'LCHOUTERROUNDEDR',
  'OTT1ROUNDEDL',
  'OTT1ROUNDEDR',
  'OTTCURVEL',
  'OTTCURVER',
  'OTTCURVEPL',
  'OTTCURVEPR',
  'ARCHCORNERPILLOW',
]

export const isLegacyShape = (type?: string | null): boolean =>
  !!type && LEGACY_SHAPES.includes(type)
