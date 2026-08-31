// Pure functions — no Apollo, no MUI, no React dependencies.

/**
 * A connectable module extracted from the live Konva canvas.
 * `id` is the Konva node `_id` (numeric) — NOT `attrs.id` (string). The
 * engine writes `attrs.connected.left/right` as Konva `_id`s in
 * sofa-drawing-stage.tsx handleDragEnd; mixing ID spaces yields zero edges.
 */
interface ModuleConnectorNode {
  id: number
  connectorTypes: Array<"left" | "right">
  connectedLeftId: number | null | undefined
  connectedRightId: number | null | undefined
}

interface ConnectedGroup {
  hasFreeLeft: boolean
  hasFreeRight: boolean
}

/**
 * Extract connectable modules from the live Konva nodes on the canvas.
 * The ONLY function here that touches `.attrs`.
 *
 * A node is skipped if it has no non-empty `attrs.connectors` array — this
 * automatically excludes armchairs/ROUND/COMPOSITE/SCHEZLONG-style pieces
 * and products vetoed via `enabled_connectors=false`, because shape
 * components render `connectors={enabled_connectors == false ? [] : connectors}`.
 *
 * Individual connectors whose `shapeType` is `'PUF'` or `'PUF-RECEIVING'`
 * are also filtered out — this mirrors a dormant veto in
 * `findMatchingConnectors` (sofa-drawing-stage.tsx:219-258) so this module
 * can't drift from the engine.
 */
function extractConnectableModuleNodes(konvaNodes: any[]): ModuleConnectorNode[] {
  const seen = new Set<number>()
  const nodes: ModuleConnectorNode[] = []

  for (const node of konvaNodes) {
    const connectors = node?.attrs?.connectors
    if (!Array.isArray(connectors) || connectors.length === 0) continue

    const survivingConnectors = connectors.filter(
      (c: any) => c?.shapeType !== "PUF" && c?.shapeType !== "PUF-RECEIVING"
    )
    if (survivingConnectors.length === 0) continue

    const id = node._id
    if (seen.has(id)) continue
    seen.add(id)

    nodes.push({
      id,
      connectorTypes: survivingConnectors.map((c: any) => c.type),
      connectedLeftId: node.attrs.connected?.left,
      connectedRightId: node.attrs.connected?.right,
    })
  }

  return nodes
}

/**
 * Group connectable modules into connected clusters via an UNDIRECTED
 * union-find: an edge is unioned if EITHER endpoint claims it
 * (connectedLeftId / connectedRightId pointing at another node in the set).
 *
 * Why undirected: the engine's disconnectShape mutates only one side of a
 * link (see sofa-drawing-stage.tsx:767-780), so the two mirrors of one
 * connection aren't guaranteed symmetric. A one-directional walk could split
 * a still-live link and produce a false warning.
 *
 * Both the edge check here and the hasFreeLeft/hasFreeRight check below use
 * `!= null` / `== null` rather than key presence: disconnectShape sets a
 * side to `null` rather than deleting the key, and Konva `_id`s are never
 * `0`, so a plain null-check is unambiguous either way.
 */
function groupConnectableModules(nodes: ModuleConnectorNode[]): ConnectedGroup[] {
  const idToIndex = new Map<number, number>()
  nodes.forEach((n, i) => idToIndex.set(n.id, i))

  const parent = nodes.map((_, i) => i)
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  function union(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  nodes.forEach((node, i) => {
    if (node.connectedLeftId != null) {
      const j = idToIndex.get(node.connectedLeftId)
      if (j !== undefined) union(i, j)
    }
    if (node.connectedRightId != null) {
      const j = idToIndex.get(node.connectedRightId)
      if (j !== undefined) union(i, j)
    }
  })

  const groups = new Map<number, ModuleConnectorNode[]>()
  nodes.forEach((node, i) => {
    const root = find(i)
    const list = groups.get(root) ?? []
    list.push(node)
    groups.set(root, list)
  })

  return Array.from(groups.values()).map((members) => ({
    hasFreeLeft: members.some(
      (m) => m.connectorTypes.includes("left") && m.connectedLeftId == null
    ),
    hasFreeRight: members.some(
      (m) => m.connectorTypes.includes("right") && m.connectedRightId == null
    ),
  }))
}

/**
 * True iff a join between two DISTINCT groups is geometrically possible:
 * some group has a free right connector and some OTHER group has a free
 * left connector. Ordered distinct pairs — NOT an OR of "any group has free
 * right" and "any group has free left" — two loose end-cap pieces that each
 * only have a right connector must NOT warn, since no join is possible.
 *
 * Connector rotation is irrelevant: the engine's own findMatchingConnectors
 * matches purely by type; corner modules just carry both types.
 */
function hasPossibleUnjoinedConnection(groups: ConnectedGroup[]): boolean {
  if (groups.length < 2) return false

  for (let i = 0; i < groups.length; i++) {
    for (let j = 0; j < groups.length; j++) {
      if (i === j) continue
      if (groups[i].hasFreeRight && groups[j].hasFreeLeft) return true
    }
  }
  return false
}

/**
 * Single entry point: true if the canvas has two or more connectable
 * modules/groups that could still be joined to each other but aren't.
 */
export function hasUnjoinedConnectableModules(konvaNodes: any[]): boolean {
  const nodes = extractConnectableModuleNodes(konvaNodes)
  const groups = groupConnectableModules(nodes)
  return hasPossibleUnjoinedConnection(groups)
}
