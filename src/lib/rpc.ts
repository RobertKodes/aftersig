import {
  Connection,
  type Finality,
  type ParsedTransactionWithMeta,
} from '@solana/web3.js'
import type { HopEvent } from './types'

export const DEFAULT_RPCS: string[] = [
  ...(import.meta.env.VITE_RPC_URL ? [import.meta.env.VITE_RPC_URL] : []),
  'https://solana-rpc.publicnode.com',
  'https://solana.leorpc.com/?api_key=FREE',
  'https://solana.drpc.org',
  'https://api.mainnet-beta.solana.com',
]

const HOP_STATUSES = new Set([403, 429, 502, 503])

export class HopError extends Error {
  status: number
  endpoint: string
  constructor(status: number, endpoint: string, message?: string) {
    super(message ?? `RPC ${endpoint} returned ${status}`)
    this.name = 'HopError'
    this.status = status
    this.endpoint = endpoint
  }
}

function statusFromError(err: unknown): number | null {
  if (err instanceof HopError) return err.status
  if (!err || typeof err !== 'object') return null
  const rec = err as Record<string, unknown>
  if (typeof rec.status === 'number') return rec.status
  if (typeof rec.code === 'number' && rec.code >= 400 && rec.code < 600) return rec.code
  const msg = String(rec.message ?? err)
  const m = msg.match(/\b(403|429|502|503)\b/)
  if (m) return Number(m[1])
  if (/forbidden|too many requests|rate.?limit|access denied/i.test(msg)) {
    if (/429|too many/i.test(msg)) return 429
    return 403
  }
  return null
}

export function shouldHop(err: unknown): boolean {
  const status = statusFromError(err)
  return status != null && HOP_STATUSES.has(status)
}

function makeFetch(endpoint: string): typeof fetch {
  return async (input, init) => {
    const res = await fetch(input, init)
    if (HOP_STATUSES.has(res.status)) {
      throw new HopError(res.status, endpoint)
    }
    return res
  }
}

export function connect(url: string, commitment: Finality = 'confirmed'): Connection {
  return new Connection(url, {
    commitment,
    disableRetryOnRateLimit: true,
    fetch: makeFetch(url),
  })
}

export type HopProgress = (event: HopEvent) => void

export async function withHop<T>(
  fn: (connection: Connection, url: string) => Promise<T>,
  opts?: { onHop?: HopProgress; endpoints?: string[] },
): Promise<{ value: T; rpc: string; hops: string[] }> {
  const endpoints = opts?.endpoints ?? DEFAULT_RPCS
  const hops: string[] = []
  let last: unknown = null

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i]
    hops.push(url)
    try {
      const connection = connect(url)
      const value = await fn(connection, url)
      return { value, rpc: url, hops }
    } catch (err) {
      last = err
      if (shouldHop(err) && i < endpoints.length - 1) {
        const status = statusFromError(err) ?? 0
        opts?.onHop?.({ from: url, status, to: endpoints[i + 1] })
        continue
      }
      if (shouldHop(err) && i === endpoints.length - 1) {
        throw new HopError(
          statusFromError(err) ?? 429,
          url,
          'Every RPC we tried waved us off (403/429). Wait a minute, or set VITE_RPC_URL to something that likes this Origin.',
        )
      }
      throw err
    }
  }

  throw last instanceof Error ? last : new Error('RPC failed')
}

export function isNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /not found|could not find|was not found|Transaction was not found/i.test(msg)
}

type JsonRpcError = { code?: number; message?: string }
type JsonRpcBody = { result?: unknown; error?: JsonRpcError }

async function rpcPost(url: string, method: string, params: unknown[]): Promise<unknown> {
  const fetcher = makeFetch(url)
  const res = await fetcher(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const body = (await res.json()) as JsonRpcBody
  if (body.error) {
    const code = body.error.code
    const message = body.error.message ?? `RPC error ${code ?? ''}`
    if (code === 403 || code === 429 || code === -32029 || code === -32005) {
      throw new HopError(code === -32029 || code === -32005 ? 429 : code, url, message)
    }
    if (/too many requests|rate.?limit|forbidden|not available on free/i.test(message)) {
      throw new HopError(/too many|rate/i.test(message) ? 429 : 403, url, message)
    }
    const err = new Error(message)
    ;(err as Error & { code?: number }).code = code
    throw err
  }
  return body.result ?? null
}

/**
 * Public nodes often implement getTransaction + jsonParsed but not
 * getParsedTransaction (web3.js’s name). Try the portable method first.
 */
export async function fetchParsedTransaction(
  connection: Connection,
  signature: string,
): Promise<ParsedTransactionWithMeta | null> {
  const url = connection.rpcEndpoint
  const cfg = {
    encoding: 'jsonParsed',
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  }
  try {
    return (await rpcPost(url, 'getTransaction', [signature, cfg])) as ParsedTransactionWithMeta | null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: number }).code
    if (code === -32601 || /method .*not (found|exist|available)/i.test(msg)) {
      return (await rpcPost(url, 'getParsedTransaction', [
        signature,
        { maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
      ])) as ParsedTransactionWithMeta | null
    }
    throw err
  }
}
