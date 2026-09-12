import { compareIntent } from './intent'
import { parseTransaction } from './parse'
import { HopError, fetchParsedTransaction, isNotFound, withHop, type HopProgress } from './rpc'
import type { DecodeFailure, DecodeResult } from './types'
import { isLikelySignature, trimSig } from './format'

export type DecodeOutcome =
  | { ok: true; result: DecodeResult }
  | { ok: false; failure: DecodeFailure }

export async function decodeSignature(
  rawSig: string,
  rawIntent: string,
  onHop?: HopProgress,
): Promise<DecodeOutcome> {
  const signature = trimSig(rawSig)
  const intent = rawIntent.trim() || null

  if (!signature) {
    return {
      ok: false,
      failure: { kind: 'invalid', message: 'Paste a transaction signature first.' },
    }
  }
  if (!isLikelySignature(signature)) {
    return {
      ok: false,
      failure: {
        kind: 'invalid',
        message:
          'That does not look like a Solana signature. Base58, usually 87–88 characters, no spaces.',
      },
    }
  }

  try {
    const { value, rpc, hops } = await withHop(async (connection) => {
      return fetchParsedTransaction(connection, signature)
    }, { onHop })

    if (!value) {
      return {
        ok: false,
        failure: {
          kind: 'not_found',
          signature,
          rpc,
          hops,
        },
      }
    }

    const parsed = parseTransaction(value, signature, rpc, hops, intent)
    const compare = compareIntent(intent, parsed.instructions, parsed.status)
    return { ok: true, result: { ...parsed, compare } }
  } catch (err) {
    if (err instanceof HopError) {
      return {
        ok: false,
        failure: {
          kind: 'throttle',
          message: err.message,
          hops: [],
        },
      }
    }
    if (isNotFound(err)) {
      return {
        ok: false,
        failure: {
          kind: 'not_found',
          signature,
          rpc: '',
          hops: [],
        },
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      failure: {
        kind: 'error',
        message: humanRpcMessage(message),
        hops: [],
      },
    }
  }
}

function humanRpcMessage(message: string): string {
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Network failed talking to the RPC. Offline, CORS, or the endpoint dropped us.'
  }
  if (/timeout|aborted/i.test(message)) {
    return 'RPC timed out. Try again, or pin VITE_RPC_URL to a quieter node.'
  }
  return message
}
