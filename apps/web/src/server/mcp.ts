import { api } from '@kinetic/convex/api'
import {
  readMcpConfiguration,
  type McpEnvironment,
} from '@kinetic/convex/mcp-configuration'
import {
  McpServer,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  hostHeaderValidationResponse,
  originValidationResponse,
  requireBearerAuth,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server'
import { ConvexHttpClient } from 'convex/browser'
import type { FunctionArgs, FunctionReturnType } from 'convex/server'
import { z } from 'zod'

import { validateConvexUrl } from '../lib/convex-auth.ts'
import { workosTokenVerifier } from '../lib/mcp-auth.ts'
import {
  flushMcpAnalytics,
  instrumentMcpAnalytics,
  type McpServerAnalytics,
} from './mcp-analytics.ts'

type ExerciseId = FunctionArgs<typeof api.exercises.get>['exerciseId']

export type ExerciseOperations = {
  list: (
    args: FunctionArgs<typeof api.exercises.list>,
  ) => Promise<FunctionReturnType<typeof api.exercises.list>>
  create: (
    args: FunctionArgs<typeof api.exercises.create>,
  ) => Promise<FunctionReturnType<typeof api.exercises.create>>
  update: (
    args: FunctionArgs<typeof api.exercises.update>,
  ) => Promise<FunctionReturnType<typeof api.exercises.update>>
  remove: (
    args: FunctionArgs<typeof api.exercises.remove>,
  ) => Promise<FunctionReturnType<typeof api.exercises.remove>>
}

type InstrumentMcpAnalytics = (
  server: McpServer,
) => McpServerAnalytics | undefined

const setColumn = z.enum(['reps', 'time', 'weight'])
const muscleReference = z.object({
  slug: z.string().trim().min(1),
  role: z.enum(['primary', 'secondary']),
})
const exerciseDefinition = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2_000).nullable(),
  defaultColumns: z
    .array(setColumn)
    .min(1)
    .refine((columns) => new Set(columns).size === columns.length, {
      message: 'Default columns must be unique.',
    }),
  muscles: z
    .array(muscleReference)
    .refine(
      (muscles) =>
        new Set(muscles.map((muscle) => muscle.slug)).size === muscles.length,
      { message: 'Muscles must be unique.' },
    ),
})

export function createExerciseMcpServer(
  operations: ExerciseOperations,
  instrumentAnalytics?: InstrumentMcpAnalytics,
) {
  const server = new McpServer(
    { name: 'kinetic', version: '1.0.0' },
    {
      instructions:
        "Kinetic is the user's exercise library. Catalog exercises are read-only. Read an existing custom exercise before updating or deleting it.",
    },
  )
  const analytics = instrumentAnalytics?.(server)

  server.registerTool(
    'list_exercises',
    {
      title: 'List exercises',
      description:
        "List the user's complete exercise library. Pass query to search exercise names case-insensitively.",
      inputSchema: z.object({
        query: z.string().trim().max(120).optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ query }) =>
      runTool(async () => ({
        exercises: await operations.list({ query }),
      })),
  )

  server.registerTool(
    'create_custom_exercise',
    {
      title: 'Create custom exercise',
      description:
        "Create a custom exercise in the user's library. Catalog exercises cannot be created or changed.",
      inputSchema: exerciseDefinition,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      runTool(
        async () => ({
          exercise: await operations.create({
            ...input,
            notes: input.notes || undefined,
          }),
        }),
        analytics,
        'exercise_created',
      ),
  )

  server.registerTool(
    'update_custom_exercise',
    {
      title: 'Update custom exercise',
      description:
        'Replace the editable definition of an existing custom exercise. Read it first and send the complete definition.',
      inputSchema: exerciseDefinition.extend({
        exerciseId: z.string().min(1),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ exerciseId, ...input }) =>
      runTool(
        async () => ({
          exercise: await operations.update({
            exerciseId: exerciseId as ExerciseId,
            ...input,
            notes: input.notes || undefined,
          }),
        }),
        analytics,
        'exercise_updated',
      ),
  )

  server.registerTool(
    'delete_custom_exercise',
    {
      title: 'Delete custom exercise',
      description:
        'Permanently delete a custom exercise.',
      inputSchema: z.object({ exerciseId: z.string().min(1) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ exerciseId }) =>
      runTool(
        async () => ({
          exerciseId: await operations.remove({
            exerciseId: exerciseId as ExerciseId,
          }),
        }),
        analytics,
        'exercise_deleted',
      ),
  )

  return server
}

type McpDependencies = {
  environment?: McpEnvironment
  operations?: (token: string) => ExerciseOperations
  verifier?: OAuthTokenVerifier
}

export async function handleMcpRequest(
  request: Request,
  dependencies: McpDependencies = {},
): Promise<Response> {
  const configuration = readMcpConfiguration(
    dependencies.environment ?? process.env,
  )
  if (!configuration) throw new Error('MCP authentication is not configured')

  const resource = new URL(configuration.resource)
  const rejected =
    hostHeaderValidationResponse(request, [resource.hostname]) ??
    originValidationResponse(request, [resource.hostname])
  if (rejected) return rejected

  const authenticate = requireBearerAuth({
    verifier: dependencies.verifier ?? workosTokenVerifier(configuration),
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resource),
  })
  const authInfo = await authenticate(request)
  if (authInfo instanceof Response) return authInfo

  const operations = dependencies.operations ?? convexOperations
  const handler = createMcpHandler(({ authInfo: requestAuthInfo, era }) =>
    createExerciseMcpServer(operations(authInfo.token), (server) =>
      instrumentMcpAnalytics(server, requestAuthInfo ?? authInfo, era),
    ),
  )
  try {
    return await handler.fetch(request, { authInfo })
  } finally {
    await flushMcpAnalytics()
  }
}

function convexOperations(token: string): ExerciseOperations {
  const client = new ConvexHttpClient(
    validateConvexUrl(process.env.VITE_CONVEX_URL),
    { auth: token },
  )
  return {
    list: (args) => client.query(api.exercises.list, args),
    create: (args) => client.mutation(api.exercises.create, args),
    update: (args) => client.mutation(api.exercises.update, args),
    remove: (args) => client.mutation(api.exercises.remove, args),
  }
}

async function runTool(
  operation: () => Promise<Record<string, unknown>>,
  analytics?: McpServerAnalytics,
  event?: Parameters<McpServerAnalytics['capture']>[0],
) {
  try {
    const value = await operation()
    if (event) await captureAnalytics(analytics, event)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(value) }],
      structuredContent: value,
    }
  } catch (error) {
    const details = publicError(error)
    return {
      isError: true,
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      structuredContent: { error: details },
    }
  }
}

async function captureAnalytics(
  analytics: McpServerAnalytics | undefined,
  event: Parameters<McpServerAnalytics['capture']>[0],
): Promise<void> {
  try {
    await analytics?.capture(event)
  } catch {
    // Analytics must not affect exercise operations.
  }
}

function publicError(error: unknown) {
  const data = isRecord(error) && isRecord(error.data) ? error.data : undefined
  const code = data && typeof data.code === 'string' ? data.code : undefined
  const message =
    data && typeof data.message === 'string' ? data.message : undefined

  return code && message && publicErrorCodes.has(code)
    ? { code, message }
    : { code: 'INTERNAL_ERROR', message: 'The exercise operation failed.' }
}

const publicErrorCodes = new Set([
  'INVALID_INPUT',
  'NOT_FOUND',
  'UNAUTHENTICATED',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
