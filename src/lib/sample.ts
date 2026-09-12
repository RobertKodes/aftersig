import { PublicKey, SystemProgram } from '@solana/web3.js'
import { fetchParsedTransaction, HopError, withHop, type HopProgress } from './rpc'

const WELL_KNOWN: PublicKey[] = [
  SystemProgram.programId,
  new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
]

function looksLikeTransfer(tx: {
  transaction?: { message?: { instructions?: unknown[] } }
}): boolean {
  const ixs = tx.transaction?.message?.instructions ?? []
  return ixs.some((ix) => {
    if (!ix || typeof ix !== 'object') return false
    const parsed = 'parsed' in ix ? (ix as { parsed?: unknown }).parsed : null
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      const type = (parsed as { type?: unknown }).type
      return type === 'transfer' || type === 'transferChecked'
    }
    return false
  })
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
            if (tx && !tx.meta?.err && looksLikeTransfer(tx)) {
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
