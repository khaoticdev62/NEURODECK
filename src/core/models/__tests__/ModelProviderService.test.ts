import { createServer, type RequestListener, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { ModelProviderService } from '../ModelProviderService'

let server: Server | null = null

function listen(handler: RequestListener): Promise<string> {
  server = createServer(handler)
  return new Promise((resolve) => {
    server!.listen(0, '127.0.0.1', () => {
      const address = server!.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolve(`http://127.0.0.1:${port}`)
    })
  })
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = null
  }
})

describe('ModelProviderService.testConnection', () => {
  it('connects to a real local HTTP server and reports real discovered models', async () => {
    const baseUrl = await listen((req, res) => {
      expect(req.url).toBe('/models')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({ data: [{ id: 'llama3:8b', owned_by: 'ollama' }, { id: 'codellama:13b' }] })
      )
    })

    const service = new ModelProviderService()
    const result = await service.testConnection(baseUrl, null)

    expect(result.ok).toBe(true)
    expect(result.models).toEqual([
      { id: 'llama3:8b', ownedBy: 'ollama' },
      { id: 'codellama:13b', ownedBy: undefined }
    ])
  })

  it('sends a real Authorization header when an API key is provided', async () => {
    let receivedAuth: string | undefined
    const baseUrl = await listen((req, res) => {
      receivedAuth = req.headers.authorization
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: [] }))
    })

    const service = new ModelProviderService()
    await service.testConnection(baseUrl, 'sk-test-key')

    expect(receivedAuth).toBe('Bearer sk-test-key')
  })

  it('reports a real HTTP error status honestly', async () => {
    const baseUrl = await listen((_req, res) => {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
    })

    const service = new ModelProviderService()
    const result = await service.testConnection(baseUrl, null)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('401')
  })

  it('reports a real connection failure when nothing is listening', async () => {
    const service = new ModelProviderService()
    const result = await service.testConnection('http://127.0.0.1:1', null)

    expect(result.ok).toBe(false)
    expect(result.models).toEqual([])
  })

  it('trims a trailing slash from the base URL before appending /models', async () => {
    let receivedPath: string | undefined
    const baseUrl = await listen((req, res) => {
      receivedPath = req.url
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: [] }))
    })

    const service = new ModelProviderService()
    await service.testConnection(`${baseUrl}/`, null)

    expect(receivedPath).toBe('/models')
  })
})
