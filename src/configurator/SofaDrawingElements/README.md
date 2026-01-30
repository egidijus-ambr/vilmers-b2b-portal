# Sofa Drawing Elements

Shared sofa shape components rendered with [Konva](https://konvajs.org/) / [react-konva](https://github.com/konvajs/react-konva).

**Source of truth:** `saas-admin-ui` repo. Changes should be made here and synced to consumer projects via `scripts/sync-sofa-elements.sh`.

## Prerequisites

```bash
# npm
npm install konva react-konva

# yarn
yarn add konva react-konva
```

## Structure

```
SofaDrawingElements/
  SofaElements/
    index.tsx              # Barrel export of all 153+ shape components
    constants.tsx          # Shared constants (colors, sizes, angles)
    MetricLines.tsx        # Dimension arrow/label components
    PillowComponent.tsx    # Decorative pillow shape
    ArrowComponent.tsx     # Arrow helper
    DoubleArrowComponent.tsx
    E.tsx                  # Shape: simple element (no armrests)
    A2L.tsx                # Shape: 2-seat with left armrest
    CORNERL.tsx            # Shape: corner piece (left)
    SOFA2.tsx              # Shape: full 2-seat sofa (both armrests)
    ...                    # 150+ more shape components
  Gizmo.tsx                # Connector point visualization (dev only)
  utils.tsx                # Geometry utilities (intersection, grouping, bounds)
```

## Quick Start

### Render a single shape (read-only preview)

```tsx
import dynamic from 'next/dynamic'
import { Stage, Layer } from 'react-konva'

// Import the shape component directly
import E from './SofaDrawingElements/SofaElements/E'

// Or import all shapes and pick by type string
import * as SofaElements from './SofaDrawingElements/SofaElements'

function SofaPreview({ type, dimensions }) {
  const SofaShape = SofaElements[type]
  if (!SofaShape) return null

  return (
    <Stage width={400} height={300}>
      <Layer>
        <SofaShape
          id="preview"
          width={dimensions.width}
          height={dimensions.length}
          x={50}
          y={50}
          scale={1}
          stageWidth={400}
          stageHeight={300}
          armrestWidth={dimensions.armrest_width}
          backrestWidth={dimensions.backrest_width}
        />
      </Layer>
    </Stage>
  )
}

// Disable SSR since Konva requires browser DOM
export default dynamic(() => Promise.resolve(SofaPreview), { ssr: false })
```

### Dynamic loading (Vite)

```ts
const modules = import.meta.glob('./SofaDrawingElements/SofaElements/*.tsx')
const modulePath = `./SofaDrawingElements/SofaElements/${shapeType}.tsx`
const ShapeModule = await modules[modulePath]()
const SofaShape = ShapeModule.default
```

## Shape Component Props

Every shape component accepts these props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | No | Unique identifier |
| `width` | `number` | Yes | Shape width in cm |
| `height` | `number` | Yes | Shape height (length) in cm |
| `x` | `number` | Yes | X position on canvas |
| `y` | `number` | Yes | Y position on canvas |
| `scale` | `number` | No | Canvas scale factor |
| `stageWidth` | `number` | Yes | Canvas stage width |
| `stageHeight` | `number` | Yes | Canvas stage height |
| `rotation` | `number` | No | Rotation in degrees (0, 90, 180, 270) |
| `armrestWidth` | `number` | No | Armrest width in cm (default: 10) |
| `backrestWidth` | `number` | No | Backrest width in cm (default: 20) |
| `armrestWidthOverride` | `number` | No | Override armrest width (e.g. from additional components) |
| `mattressWidth` | `number` | No | Mattress width (for sofa-bed shapes) |
| `mattressLength` | `number` | No | Mattress length (for sofa-bed shapes) |
| `cornerPartLength` | `number` | No | Corner part length (for corner shapes) |
| `cornerRadius` | `number` | No | Corner radius (for rounded shapes) |
| `composition` | `array` | No | Sub-shape layout (for COMPOSITE shape) |
| `angle` | `number` | No | Angle in degrees (for angled shapes) |
| `draggable` | `boolean` | No | Enable drag-and-drop (default: false) |
| `verticalMetric` | `boolean` | No | Show height measurement arrow |
| `horizontalMetric` | `boolean` | No | Show width measurement arrow |
| `showButtons` | `boolean` | No | Show rotate/delete buttons |

## Shape Types

Each shape file exports a React component and a `getDimensions()` function that returns connector positions.

| Family | Examples | Description |
|--------|----------|-------------|
| `E` | E, EP, ESQ | Simple element (no armrests) |
| `A1L/R` | A1L, A1R, A1PL, A1ROUNDEDL | 1-seat with left/right armrest |
| `A2L/R` | A2L, A2R, A2UL, A2PPL | 2-seat with left/right armrest |
| `A3L/R` | A3L, A3R, A3PL | 3-seat with left/right armrest |
| `CORNERL/R` | CORNERL, CORNERR, CORNERROUNDEDL | Corner pieces |
| `SOFA1/2/3` | SOFA1, SOFA2, SOFA3, SOFA2PP | Full sofas (both armrests) |
| `FOTEL` | FOTEL, FOTELP, FOTELSQ | Armchairs |
| `OA` | OA, OA3, OAPP, OAU | Open-arm pieces |
| `LCHL/R` | LCHL, LCHR, LCHOUTERL | Chaise lounge pieces |
| `OTT/OTK` | OTT1L, OTKL, OTKCL | Ottoman pieces |
| `PUF` | PUF | Pouf/ottoman |
| `TABLE` | TABLE, TABLEMOON | Table modules |
| `COMPOSITE` | COMPOSITE | Dynamic multi-shape composition |

## Constants

Defined in `SofaElements/constants.tsx`:

```ts
BACK_REST_WIDTH = 25       // Default backrest width (cm)
ARMS_REST_WIDTH = 22       // Default armrest width (cm)
SHADOW_WIDTH = 6           // Shadow stroke width
MAIN_SHAPE_COLOR = '#e2e1e0'
MAIN_SHAPE_SHADOW_COLOR = 'rgba(0, 0, 0, 0.10)'
```

## Utilities

`utils.tsx` exports geometry functions used by the interactive configurator:

- `getGroupOfGroupsRect()` / `getGroupOfGroupsRectWithScale()` - bounding box of connected shape groups
- `haveIntersection()` - rectangle overlap detection
- `recursiveGroupMatchingFunction()` - merge connected groups by shared IDs
- `getArmrestOverides()` - extract armrest width overrides from additional components
- `getShapeExtensionHeight()` - calculate extension height for recliner shapes
- `drawVerticalZigzag()` - draw zigzag pattern on canvas context

## Syncing

This folder is synced across projects. **Do not edit these files outside `saas-admin-ui`.**

To sync into a consumer project, run from that project's root:
```bash
./scripts/sync-sofa-elements.sh
```
