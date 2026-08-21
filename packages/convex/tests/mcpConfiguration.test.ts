import { describe, expect, test } from 'vitest'

import { readMcpConfiguration } from '../convex/mcpConfiguration'

describe('MCP configuration', () => {
  test('is optional when both values are absent', () => {
    expect(readMcpConfiguration({})).toBeUndefined()
  })

  test('validates the resource and authorization server together', () => {
    expect(() =>
      readMcpConfiguration({ MCP_RESOURCE_URL: 'https://kinetic.rocks/mcp' }),
    ).toThrow('must be configured together')

    expect(
      readMcpConfiguration({
        MCP_RESOURCE_URL: 'https://kinetic.rocks/mcp',
        WORKOS_AUTHKIT_DOMAIN: 'https://kinetic.authkit.app/',
      }),
    ).toEqual({
      resource: 'https://kinetic.rocks/mcp',
      authorizationServer: 'https://kinetic.authkit.app',
    })
  })

  test('rejects an insecure public resource or a different path', () => {
    expect(() =>
      readMcpConfiguration({
        MCP_RESOURCE_URL: 'http://kinetic.rocks/mcp',
        WORKOS_AUTHKIT_DOMAIN: 'https://kinetic.authkit.app',
      }),
    ).toThrow('HTTPS URL ending in /mcp')
    expect(() =>
      readMcpConfiguration({
        MCP_RESOURCE_URL: 'https://kinetic.rocks/agent',
        WORKOS_AUTHKIT_DOMAIN: 'https://kinetic.authkit.app',
      }),
    ).toThrow('HTTPS URL ending in /mcp')
  })
})
