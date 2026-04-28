type WithRole = { role?: string | null } | null | undefined

export const isAgent = (c: WithRole): boolean => c?.role === 'agent'
export const isAdmin = (c: WithRole): boolean => c?.role === 'admin'
export const isAgentOrAdmin = (c: WithRole): boolean => isAgent(c) || isAdmin(c)
