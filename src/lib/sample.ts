import { PublicKey, SystemProgram } from '@solana/web3.js'
import { isSwapProgram } from './programs'
import { fetchParsedTransaction, HopError, withHop, type HopProgress } from './rpc'

const WELL_KNOWN: PublicKey[] = [
  SystemProgram.programId,
  new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
]

function programIdOf(ix: unknown): string {
  if (!ix || typeof ix !== 'object' || !('programId' in ix)) return ''
  const raw = (ix as { programId?: unknown }).programId
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'toBase58' in raw) {
    const fn = (raw as { toBase58?: () => string }).toBase58
    if (typeof fn === 'function') return fn.call(raw)
  }
  return String(raw ?? '')
}

function parsedType(ix: unknown): string | null {
  if (!ix || typeof ix !== 'object' || !('parsed' in ix)) return null
  const parsed = (ix as { parsed?: unknown }).parsed
  if (parsed && typeof parsed === 'object' && 'type' in parsed) {
    const type = (parsed as { type?: unknown }).type
    return typeof type === 'string' ? type : null
  }
  return null
}

function flattenIxs(tx: unknown): unknown[] {
  const rec = tx as {
    transaction?: { message?: { instructions?: unknown[] } }
    meta?: { innerInstructions?: Array<{ instructions?: unknown[] }> | null }
  }
  const outer = rec.transaction?.message?.instructions ?? []
  const inner = (rec.meta?.innerInstructions ?? []).flatMap((g) => g.instructions ?? [])
  return [...outer, ...inner]
}

function isSimpleSolTransfer(tx: unknown): boolean {
  const ixs = flattenIxs(tx)
  const hasSystemTransfer = ixs.some(
    (ix) => programIdOf(ix) === SystemProgram.programId.toBase58() && parsedType(ix) === 'transfer',
  )
  const hasSwap = ixs.some((ix) => isSwapProgram(programIdOf(ix)))
  return hasSystemTransfer && !hasSwap
}

export async function fetchSampleSignature(onHop?: HopProgress): Promise<{
  signature: string
  rpc: string
}> {
  let last: unknown = null
  for (const address of WELL_KNOWN) {
    try {
      const { value, rpc } = await withHop(async (connection) => {
        const sigs = await connection.getSignaturesForAddress(address, { limit: 25 })
        const ok = sigs.filter((s) => s.err == null && s.signature)
        if (!ok.length) throw new Error('no successful signatures in this batch')

        for (const row of ok.slice(0, 8)) {
          try {
            const tx = await fetchParsedTransaction(connection, row.signature)
            if (tx && !tx.meta?.err && isSimpleSolTransfer(tx)) {
              return row.signature
            }
          } catch {
            // keep scanning
          }
        }
        return ok[0].signature
      }, { onHop })
      return { signature: value, rpc }
    } catch (err) {
      last = err
      if (err instanceof HopError) throw err
    }
  }
  throw last instanceof Error
    ? last
    : new Error('Could not grab a fresh public signature. RPC may be picky right now.')
}
