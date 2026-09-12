import type { AgentExport, DecodeResult } from './types'

export function toAgentExport(result: DecodeResult): AgentExport {
  return {
    signature: result.signature,
    status: result.status,
    intent: result.intent,
    verdict: result.compare?.verdict ?? null,
    errors: result.errors.map((e) => ({
      source: e.source,
      code: e.code,
      message: e.message,
      guess: e.guess,
      instructionIndex: e.instructionIndex,
      raw: e.raw,
    })),
    instructions: result.instructions.map((ix) => ({
      index: ix.index,
      inner: ix.inner,
      program: ix.programLabel,
      programId: ix.programId,
      type: ix.type,
      summary: ix.summary,
    })),
    balances: result.balances,
    tokens: result.tokens,
    slot: result.slot,
    blockTime: result.blockTime,
    feeLamports: result.feeLamports,
    rpc: result.rpc,
  }
}

export function exportFilename(signature: string): string {
  return `aftersig-${signature.slice(0, 8)}.json`
}
