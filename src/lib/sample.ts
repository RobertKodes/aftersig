import { PublicKey, SystemProgram } from '@solana/web3.js'
import { HopError, withHop, type HopProgress } from './rpc'

const WELL_KNOWN: PublicKey[] = [
  SystemProgram.programId,
  new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
]

export async function fetchSampleSignature(onHop?: HopProgress): Promise<{
  signature: string
  rpc: string
}> {
  let last: unknown = null
  for (const address of WELL_KNOWN) {
    try {
      const { value, rpc } = await withHop(async (connection) => {
        const sigs = await connection.getSignaturesForAddress(address, { limit: 20 })
        const ok = sigs.find((s) => s.err == null && s.signature)
        if (!ok) throw new Error('no successful signatures in this batch')
        return ok.signature
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
