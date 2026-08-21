import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

import { SignJWT, exportJWK, generateKeyPair } from 'jose'

import {
  handleMcpRequest,
  type ExerciseOperations,
} from '../server/mcp.ts'

test('authenticates a signed client and serves every exercise tool', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  const keyId = 'smoke-key'
  const jwksServer = createServer((request, response) => {
    if (request.url !== '/oauth2/jwks') {
      response.writeHead(404).end()
      return
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ keys: [{ ...jwk, kid: keyId, alg: 'RS256' }] }))
  })
  await new Promise<void>((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))

  try {
    const address = jwksServer.address()
    assert.ok(address && typeof address === 'object')
    const authorizationServer = `http://127.0.0.1:${address.port}`
    const resource = `http://127.0.0.1:${address.port}/mcp`
    const environment = {
      MCP_RESOURCE_URL: resource,
      WORKOS_AUTHKIT_DOMAIN: authorizationServer,
    }
    const exerciseOperations = operations()

    const challenge = await handleMcpRequest(
      new Request(resource, { headers: { Host: new URL(resource).host } }),
      {
        environment,
        operations: () => exerciseOperations,
      },
    )
    assert.equal(challenge.status, 401)
    assert.match(
      challenge.headers.get('WWW-Authenticate') ?? '',
      /resource_metadata="http:\/\/127\.0\.0\.1:\d+\/\.well-known\/oauth-protected-resource\/mcp"/,
    )

    const wrongAudience = await signToken(
      privateKey,
      keyId,
      authorizationServer,
      `${authorizationServer}/wrong`,
    )
    const rejected = await mcpRequest(
      resource,
      wrongAudience,
      'tools/list',
      {},
      environment,
      exerciseOperations,
    )
    assert.equal(rejected.status, 401)

    const token = await signToken(
      privateKey,
      keyId,
      authorizationServer,
      resource,
    )
    const listedTools = await rpc(
      resource,
      token,
      'tools/list',
      {},
      environment,
      exerciseOperations,
    )
    const tools = array(record(listedTools.result).tools).map(record)
    assert.deepEqual(
      tools.map((tool) => tool.name),
      [
        'list_exercises',
        'create_custom_exercise',
        'update_custom_exercise',
        'delete_custom_exercise',
      ],
    )
    assert.equal(record(tools[0].annotations).readOnlyHint, true)
    assert.equal(record(tools[3].annotations).destructiveHint, true)

    const created = await rpc(
      resource,
      token,
      'tools/call',
      {
        name: 'create_custom_exercise',
        arguments: {
          name: 'Ring Press',
          notes: null,
          defaultColumns: ['reps'],
          muscles: [],
        },
      },
      environment,
      exerciseOperations,
    )
    assert.equal(record(toolContent(created).exercise).name, 'Ring Press')

    const listed = await rpc(
      resource,
      token,
      'tools/call',
      { name: 'list_exercises', arguments: { query: 'ring' } },
      environment,
      exerciseOperations,
    )
    assert.equal(array(toolContent(listed).exercises).length, 1)

    const updated = await rpc(
      resource,
      token,
      'tools/call',
      {
        name: 'update_custom_exercise',
        arguments: {
          exerciseId: 'exercise_123',
          name: 'Ring Push-Up',
          notes: 'Keep rings turned out.',
          defaultColumns: ['reps'],
          muscles: [],
        },
      },
      environment,
      exerciseOperations,
    )
    assert.equal(record(toolContent(updated).exercise).name, 'Ring Push-Up')

    const removed = await rpc(
      resource,
      token,
      'tools/call',
      {
        name: 'delete_custom_exercise',
        arguments: { exerciseId: 'exercise_123' },
      },
      environment,
      exerciseOperations,
    )
    assert.equal(toolContent(removed).exerciseId, 'exercise_123')
  } finally {
    await new Promise<void>((resolve, reject) =>
      jwksServer.close((error) => (error ? reject(error) : resolve())),
    )
  }
})

function operations(): ExerciseOperations {
  type Exercise = Awaited<ReturnType<ExerciseOperations['create']>>
  type ExerciseId = Parameters<ExerciseOperations['remove']>[0]['exerciseId']
  const exerciseId = 'exercise_123' as ExerciseId
  let exercise: Exercise | undefined

  return {
    list: async ({ query }) => {
      if (!exercise || (query && !exercise.name.toLowerCase().includes(query))) {
        return []
      }
      return [
        {
          source: { kind: 'custom', exerciseId },
          name: exercise.name,
          notes: exercise.notes,
          defaultColumns: exercise.defaultColumns,
          muscles: exercise.muscles,
        },
      ]
    },
    create: async (input) => {
      const created: Exercise = {
        _id: exerciseId,
        _creationTime: 1,
        ...input,
        notes: input.notes,
        updatedAt: 1,
      }
      exercise = created
      return created
    },
    update: async ({ exerciseId: _exerciseId, ...input }) => {
      const updated: Exercise = {
        _id: exerciseId,
        _creationTime: 1,
        ...input,
        notes: input.notes,
        updatedAt: 2,
      }
      exercise = updated
      return updated
    },
    remove: async () => {
      exercise = undefined
      return exerciseId
    },
  }
}

async function signToken(
  privateKey: CryptoKey,
  keyId: string,
  issuer: string,
  audience: string,
) {
  return new SignJWT({ scope: 'openid profile', client_id: 'smoke-client' })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setSubject('user_smoke')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey)
}

async function rpc(
  resource: string,
  token: string,
  method: string,
  params: Record<string, unknown>,
  environment: Record<string, string>,
  exerciseOperations: ExerciseOperations,
) {
  const response = await mcpRequest(
    resource,
    token,
    method,
    params,
    environment,
    exerciseOperations,
  )
  assert.equal(response.status, 200, await response.clone().text())
  return parseResponse(response)
}

function mcpRequest(
  resource: string,
  token: string,
  method: string,
  params: Record<string, unknown>,
  environment: Record<string, string>,
  exerciseOperations: ExerciseOperations,
) {
  const url = new URL(resource)
  return handleMcpRequest(
    new Request(resource, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Host: url.host,
        'MCP-Protocol-Version': '2025-11-25',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }),
    { environment, operations: () => exerciseOperations },
  )
}

async function parseResponse(response: Response) {
  const body = await response.text()
  if (response.headers.get('Content-Type')?.startsWith('text/event-stream')) {
    const data = body
      .split('\n')
      .find((line) => line.startsWith('data: '))
      ?.slice('data: '.length)
    assert.ok(data)
    return record(JSON.parse(data))
  }
  return record(JSON.parse(body))
}

function toolContent(response: Record<string, unknown>) {
  return record(record(response.result).structuredContent)
}

function record(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object')
  assert.notEqual(value, null)
  assert.equal(Array.isArray(value), false)
  return value as Record<string, unknown>
}

function array(value: unknown): unknown[] {
  assert.ok(Array.isArray(value))
  return value
}
