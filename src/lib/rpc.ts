import { Connection, type Finality } from '@solana/web3.js'
import type { HopEvent } from './types'

export const DEFAULT_RPCS: string[] = [
  ...(import.meta.env.VITE_RPC_URL ? [import.meta.env.VITE_RPC_URL] : []),
  'https://solana-rpc.publicnode.com',
  'https://solana.drpc.org',
  'https://rpc.ankr.com/solana',
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
