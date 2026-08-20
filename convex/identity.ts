import { ConvexError } from 'convex/values'

import type { MutationCtx, QueryCtx } from './_generated/server'

export async function requireOwnerId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError('Unauthenticated')
  return identity.tokenIdentifier
}
