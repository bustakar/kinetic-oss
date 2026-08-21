import { ConvexError } from 'convex/values'

import type { MutationCtx, QueryCtx } from './_generated/server'

type AuthContext = Pick<QueryCtx | MutationCtx, 'auth'>

export async function requireOwnerId(ctx: AuthContext): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) {
    throw new ConvexError({
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    })
  }
  return identity.subject
}
