import type { HumanError } from './types'

const TX_ERRORS: Record<string, string> = {
  AccountInUse: 'An account in this transaction is already in use.',
  AccountLoadedTwice: 'The same account was loaded twice.',
  AccountNotFound: 'An account in this transaction does not exist.',
  ProgramAccountNotFound: 'A program account was not found.',
  InsufficientFundsForFee: 'Not enough SOL to cover the transaction fee.',
  InvalidAccountForFee: 'The fee payer account is not valid.',
  AlreadyProcessed: 'This signature was already processed.',
  BlockhashNotFound: 'The recent blockhash is gone (stale, or never seen).',
  CallChainTooDeep: 'The CPI call chain is too deep.',
  MissingSignatureForFee: 'The fee payer did not sign.',
  InvalidAccountIndex: 'An account index in the message is invalid.',
  SignatureFailure: 'A signature on this transaction failed verification.',
  InvalidProgramForExecution: 'A program marked for execution is not valid.',
  SanitizeFailure: 'The runtime rejected the transaction while sanitizing it.',
  ClusterMaintenance: 'The cluster is in maintenance.',
  AccountBorrowOutstanding: 'An account borrow was still outstanding.',
  WouldExceedMaxBlockCostLimit: 'This would exceed the block compute cost limit.',
  UnsupportedVersion: 'Unsupported transaction version.',
  InvalidWritableAccount: 'A writable account in the message is invalid.',
  WouldExceedMaxAccountCostLimit: 'This would exceed the per-account cost limit.',
  WouldExceedAccountDataBlockLimit: 'This would exceed the account-data block limit.',
  TooManyAccountLocks: 'Too many account locks.',
  AddressLookupTableNotFound: 'An address lookup table was not found.',
  InvalidAddressLookupTableOwner: 'Address lookup table has the wrong owner.',
  InvalidAddressLookupTableData: 'Address lookup table data is invalid.',
  InvalidAddressLookupTableIndex: 'Address lookup table index is out of range.',
  InvalidRentPayingAccount: 'An account would be left in a rent-paying state illegally.',
  WouldExceedMaxVoteCostLimit: 'This would exceed the vote cost limit.',
  WouldExceedAccountDataTotalLimit: 'This would exceed the total account-data limit.',
  DuplicateInstruction: 'A forbidden duplicate instruction.',
  InsufficientFundsForRent: 'Not enough SOL to keep an account rent-exempt.',
  MaxLoadedAccountsDataSizeExceeded: 'Loaded account data exceeded the max size.',
  InvalidLoadedAccountsDataSizeLimit: 'Loaded-accounts data size limit is invalid.',
  ResanitizationNeeded: 'The runtime asked for a resanitize.',
  ProgramExecutionTemporarilyRestricted: 'Program execution is temporarily restricted.',
  UnbalancedTransaction: 'Lamports in ≠ lamports out. Unbalanced transaction.',
  ProgramCacheHitMaxLimit: 'Program cache hit its max.',
  CommitCancelled: 'The commit was cancelled.',
}

const IX_ERRORS: Record<string, string> = {
  GenericError: 'Generic instruction error.',
  InvalidArgument: 'Invalid argument to the instruction.',
  InvalidInstructionData: 'Instruction data is invalid.',
  InvalidAccountData: 'Account data is invalid.',
  AccountDataTooSmall: 'Account data is too small for what the program wrote.',
  InsufficientFunds: 'Insufficient funds for this instruction.',
  IncorrectProgramId: 'Incorrect program id.',
  MissingRequiredSignature: 'A required signature is missing.',
  AccountAlreadyInitialized: 'Account is already initialized.',
  UninitializedAccount: 'Account is not initialized.',
  UnbalancedInstruction: 'Instruction left lamports unbalanced.',
  ModifiedProgramId: 'Program id was modified (illegal).',
  ExternalAccountLamportSpend: 'Tried to spend lamports of an external account.',
  ExternalAccountDataModified: 'Tried to modify data of an external account.',
  ReadonlyLamportChange: 'A readonly account changed lamports.',
  ReadonlyDataModified: 'A readonly account had its data modified.',
  DuplicateAccountIndex: 'Duplicate account index in the instruction.',
  ExecutableModified: 'Executable bit was modified.',
  RentEpochModified: 'Rent epoch was modified.',
  NotEnoughAccountKeys: 'Not enough account keys for this instruction.',
  AccountDataSizeChanged: 'Account data size changed when it should not have.',
  AccountNotExecutable: 'Account is not executable.',
  AccountBorrowFailed: 'Failed to borrow an account.',
  AccountBorrowOutstanding: 'Account borrow still outstanding.',
  DuplicateAccountOutOfSync: 'Duplicate account is out of sync.',
  InvalidError: 'Program returned an invalid error.',
  ExecutableDataModified: 'Executable account data was modified.',
  ExecutableLamportChange: 'Executable account lamports changed illegally.',
  ExecutableAccountNotRentExempt: 'Executable account is not rent-exempt.',
  UnsupportedProgramId: 'Unsupported program id.',
  CallDepth: 'CPI call depth exceeded.',
  ReentrancyNotAllowed: 'Reentrancy is not allowed.',
  MaxSeedLengthExceeded: 'Max seed length exceeded.',
  InvalidSeeds: 'Invalid PDA seeds.',
  InvalidRealloc: 'Invalid realloc.',
  ComputationalBudgetExceeded: 'Compute budget exceeded.',
  PrivilegeEscalation: 'Privilege escalation (signed as something it should not).',
  ProgramEnvironmentSetupFailure: 'Program environment setup failed.',
  ProgramFailedToComplete: 'Program failed to complete.',
  ProgramFailedToCompile: 'Program failed to compile.',
  Immutable: 'Tried to mutate an immutable account.',
  IncorrectAuthority: 'Incorrect authority.',
  BorshIoError: 'Borsh serialization/deserialization failed.',
  AccountNotRentExempt: 'Account is not rent-exempt.',
  InvalidAccountOwner: 'Invalid account owner.',
  ArithmeticOverflow: 'Arithmetic overflow.',
  UnsupportedSysvar: 'Unsupported sysvar.',
  IllegalOwner: 'Illegal owner.',
  MaxAccountsDataAllocationsExceeded: 'Max account data allocations exceeded.',
  MaxAccountsExceeded: 'Max accounts exceeded.',
  MaxInstructionTraceLengthExceeded: 'Instruction trace is too long.',
  BuiltinProgramsMustConsumeComputeUnits: 'A builtin program returned without consuming CU.',
}

/** Anchor framework error codes (from anchor-lang). Custom(code) in this range is usually Anchor. */
const ANCHOR_ERRORS: Record<number, { name: string; message: string }> = {
  100: { name: 'InstructionMissing', message: 'The 8-byte instruction discriminator is missing.' },
  101: { name: 'InstructionFallbackNotFound', message: 'Fallback functions are not supported. Wrong instruction name / discriminator.' },
  102: { name: 'InstructionDidNotDeserialize', message: 'The instruction did not deserialize. Args do not match the IDL.' },
  103: { name: 'InstructionDidNotSerialize', message: 'The instruction did not serialize.' },
  1000: { name: 'IdlInstructionStub', message: 'The program was compiled without IDL instructions (stub).' },
  1001: { name: 'IdlInstructionInvalidProgram', message: 'IDL instruction used against the wrong program.' },
  2000: { name: 'ConstraintMut', message: 'A mut constraint failed. Account should have been writable.' },
  2001: { name: 'ConstraintHasOne', message: 'A has_one constraint failed. Related account does not match.' },
  2002: { name: 'ConstraintSigner', message: 'A signer constraint failed. Expected this account to sign.' },
  2003: { name: 'ConstraintRaw', message: 'A raw constraint (constraint = …) failed.' },
  2004: { name: 'ConstraintOwner', message: 'An owner constraint failed. Wrong account owner.' },
  2005: { name: 'ConstraintRentExempt', message: 'A rent-exempt constraint failed.' },
  2006: { name: 'ConstraintSeeds', message: 'A seeds constraint failed. PDA does not match the declared seeds.' },
  2007: { name: 'ConstraintExecutable', message: 'An executable constraint failed.' },
  2008: { name: 'ConstraintState', message: 'A state constraint failed.' },
  2009: { name: 'ConstraintAssociated', message: 'An associated-token constraint failed.' },
  2010: { name: 'ConstraintAssociatedInit', message: 'An associated-token init constraint failed.' },
  2011: { name: 'ConstraintClose', message: 'A close constraint failed.' },
  2012: { name: 'ConstraintAddress', message: 'An address constraint failed. Account is not the expected address.' },
  2013: { name: 'ConstraintZero', message: 'A zero constraint failed. Account should have been uninitialized / zeroed.' },
  2014: { name: 'ConstraintTokenMint', message: 'A token mint constraint failed.' },
  2015: { name: 'ConstraintTokenOwner', message: 'A token owner constraint failed.' },
  2016: { name: 'ConstraintMintMintAuthority', message: 'A mint-authority constraint failed.' },
  2017: { name: 'ConstraintMintFreezeAuthority', message: 'A freeze-authority constraint failed.' },
  2018: { name: 'ConstraintMintDecimals', message: 'A mint decimals constraint failed.' },
  2019: { name: 'ConstraintSpace', message: 'A space constraint failed. Account size is wrong.' },
  2020: { name: 'ConstraintAccountIsNone', message: 'An optional account was Some when it should have been None (or the reverse).' },
  2021: { name: 'ConstraintTokenTokenProgram', message: 'A token-program constraint failed.' },
  2022: { name: 'ConstraintMintTokenProgram', message: 'A mint token-program constraint failed.' },
  2023: { name: 'ConstraintAssociatedTokenTokenProgram', message: 'An associated-token token-program constraint failed.' },
  2024: { name: 'ConstraintMintGroupPointerExtension', message: 'Mint group-pointer extension constraint failed.' },
  2025: { name: 'ConstraintMintGroupMemberPointerExtension', message: 'Mint group-member-pointer extension constraint failed.' },
  2026: { name: 'ConstraintMintMetadataPointerExtension', message: 'Mint metadata-pointer extension constraint failed.' },
  2027: { name: 'ConstraintMintCloseAuthorityExtension', message: 'Mint close-authority extension constraint failed.' },
  2028: { name: 'ConstraintMintPermanentDelegateExtension', message: 'Mint permanent-delegate extension constraint failed.' },
  2029: { name: 'ConstraintMintTransferHookExtension', message: 'Mint transfer-hook extension constraint failed.' },
  3000: { name: 'AccountDiscriminatorAlreadySet', message: 'The account discriminator was already set.' },
  3001: { name: 'AccountDiscriminatorNotFound', message: 'The account discriminator was not found. Probably not an Anchor account.' },
  3002: { name: 'AccountDiscriminatorMismatch', message: 'Account discriminator mismatch. Wrong account type for this instruction.' },
  3003: { name: 'AccountDidNotDeserialize', message: 'The account did not deserialize. Data does not match the declared type.' },
  3004: { name: 'AccountDidNotSerialize', message: 'The account did not serialize.' },
  3005: { name: 'AccountNotEnoughKeys', message: 'Not enough account keys were provided.' },
  3006: { name: 'AccountNotMutable', message: 'The account is not mutable. Add mut / writable.' },
  3007: { name: 'AccountOwnedByWrongProgram', message: 'The account is owned by the wrong program.' },
  3008: { name: 'InvalidProgramId', message: 'Invalid program id.' },
  3009: { name: 'InvalidProgramExecutable', message: 'Program account is not executable.' },
  3010: { name: 'AccountNotSigner', message: 'The account is not a signer.' },
  3011: { name: 'AccountNotSystemOwned', message: 'The account is not owned by the System program.' },
  3012: { name: 'AccountNotInitialized', message: 'The account is not initialized.' },
  3013: { name: 'AccountNotProgramData', message: 'The account is not a program-data account.' },
  3014: { name: 'AccountNotAssociatedTokenAccount', message: 'The account is not an associated token account.' },
  3015: { name: 'AccountSysvarMismatch', message: 'Sysvar account mismatch.' },
  3016: { name: 'AccountReallocExceedsLimit', message: 'Account realloc exceeds the limit.' },
  3017: { name: 'AccountDuplicateReallocs', message: 'Duplicate reallocs on the same account.' },
  4100: { name: 'DeclaredProgramIdMismatch', message: 'declare_id! does not match the program id this was invoked as.' },
  5000: { name: 'Deprecated', message: 'The API used is deprecated.' },
}

const ANCHOR_LOG = /Error Code: ([A-Za-z0-9_]+)\. Error Number: (\d+)\. Error Message: (.+)/
const ANCHOR_LEFT = /AnchorError[^\n]*Error Code: ([A-Za-z0-9_]+)/
const CUSTOM_LOG = /custom program error: (0x[0-9a-fA-F]+|\d+)/
const PROGRAM_FAILED = /Program ([1-9A-HJ-NP-Za-km-z]+) failed: (.+)/

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function describeCustom(code: number): { code: string; message: string; source: HumanError['source']; guess: boolean } {
  const anchor = ANCHOR_ERRORS[code]
  if (anchor) {
    return {
      code: `Anchor ${code} (${anchor.name})`,
      message: anchor.message,
      source: 'anchor',
      guess: false,
    }
  }
  const hex = `0x${code.toString(16)}`
  if (code >= 100 && code < 6000) {
    return {
      code: `Custom(${code} / ${hex})`,
      message:
        'Custom program error in the Anchor-ish range, but not a known framework code. Likely the program’s own error enum — treat this as a guess.',
      source: 'unknown',
      guess: true,
    }
  }
  return {
    code: `Custom(${code} / ${hex})`,
    message: 'Custom program error. The program defined this number; aftersig does not have a name for it.',
    source: 'instruction',
    guess: true,
  }
}

function flattenInstructionError(
  pair: unknown,
): { index: number | null; kind: unknown } {
  if (!Array.isArray(pair) || pair.length < 2) {
    return { index: null, kind: pair }
  }
  const index = typeof pair[0] === 'number' ? pair[0] : null
  return { index, kind: pair[1] }
}

function describeIxKind(kind: unknown): Omit<HumanError, 'instructionIndex' | 'raw'> {
  if (typeof kind === 'string') {
    return {
      source: 'instruction',
      code: kind,
      message: IX_ERRORS[kind] ?? `Instruction error: ${kind}.`,
      guess: !IX_ERRORS[kind],
    }
  }
  const rec = asRecord(kind)
  if (rec && 'Custom' in rec && typeof rec.Custom === 'number') {
    const mapped = describeCustom(rec.Custom)
    return mapped
  }
  if (rec && 'BorshIoError' in rec) {
    return {
      source: 'instruction',
      code: 'BorshIoError',
      message: `Borsh I/O error: ${String(rec.BorshIoError)}`,
      guess: false,
    }
  }
  const name = rec ? Object.keys(rec)[0] : null
  if (name && IX_ERRORS[name]) {
    return {
      source: 'instruction',
      code: name,
      message: IX_ERRORS[name],
      guess: false,
    }
  }
  return {
    source: 'instruction',
    code: name ?? 'InstructionError',
    message: 'Instruction failed. See raw JSON.',
    guess: true,
  }
}

export function humanizeMetaErr(err: unknown): HumanError[] {
  if (err == null) return []
  if (typeof err === 'string') {
    return [
      {
        source: 'transaction',
        code: err,
        message: TX_ERRORS[err] ?? `Transaction error: ${err}.`,
        guess: !TX_ERRORS[err],
        instructionIndex: null,
        raw: err,
      },
    ]
  }
  const rec = asRecord(err)
  if (!rec) {
    return [
      {
        source: 'unknown',
        code: 'Unknown',
        message: 'Transaction failed. Could not parse meta.err.',
        guess: true,
        instructionIndex: null,
        raw: err,
      },
    ]
  }

  if ('InstructionError' in rec) {
    const { index, kind } = flattenInstructionError(rec.InstructionError)
    const described = describeIxKind(kind)
    return [
      {
        ...described,
        instructionIndex: index,
        raw: err,
      },
    ]
  }

  const name = Object.keys(rec)[0]
  if (name && TX_ERRORS[name]) {
    return [
      {
        source: 'transaction',
        code: name,
        message: TX_ERRORS[name],
        guess: false,
        instructionIndex: null,
        raw: err,
      },
    ]
  }

  if (typeof name === 'string' && TX_ERRORS[name] == null && name in rec) {
    return [
      {
        source: 'transaction',
        code: name,
        message: TX_ERRORS[name] ?? `Transaction error: ${name}.`,
        guess: !TX_ERRORS[name],
        instructionIndex: null,
        raw: err,
      },
    ]
  }

  return [
    {
      source: 'unknown',
      code: name ?? 'Unknown',
      message: 'Transaction failed. See raw JSON.',
      guess: true,
      instructionIndex: null,
      raw: err,
    },
  ]
}

export function errorsFromLogs(logs: string[] | null | undefined): HumanError[] {
  if (!logs?.length) return []
  const out: HumanError[] = []
  const seen = new Set<string>()

  for (const line of logs) {
    const anchor = line.match(ANCHOR_LOG)
    if (anchor) {
      const name = anchor[1]
      const num = Number(anchor[2])
      const msg = anchor[3]?.trim() ?? ''
      const key = `anchor:${num}:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      const known = ANCHOR_ERRORS[num]
      out.push({
        source: 'anchor',
        code: `Anchor ${num} (${name})`,
        message: known?.message ?? msg,
        guess: !known,
        instructionIndex: null,
        raw: line,
      })
      continue
    }

    const left = line.match(ANCHOR_LEFT)
    if (left && !line.match(ANCHOR_LOG)) {
      const name = left[1]
      const key = `anchor-name:${name}`
      if (!seen.has(key)) {
        seen.add(key)
        const entry = Object.entries(ANCHOR_ERRORS).find(([, v]) => v.name === name)
        out.push({
          source: 'anchor',
          code: entry ? `Anchor ${entry[0]} (${name})` : name,
          message: entry?.[1].message ?? `Anchor error ${name}.`,
          guess: !entry,
          instructionIndex: null,
          raw: line,
        })
      }
    }

    const custom = line.match(CUSTOM_LOG)
    if (custom) {
      const raw = custom[1]
      const num = raw.startsWith('0x') ? parseInt(raw, 16) : Number(raw)
      const key = `custom:${num}`
      if (!seen.has(key) && Number.isFinite(num)) {
        seen.add(key)
        const mapped = describeCustom(num)
        out.push({
          ...mapped,
          instructionIndex: null,
          raw: line,
        })
      }
    }

    const failed = line.match(PROGRAM_FAILED)
    if (failed) {
      const key = `fail:${failed[1]}:${failed[2]}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push({
          source: 'log',
          code: 'ProgramFailed',
          message: `Program ${failed[1].slice(0, 4)}…${failed[1].slice(-4)} failed: ${failed[2]}`,
          guess: false,
          instructionIndex: null,
          raw: line,
        })
      }
    }
  }

  return out
}

export function mergeErrors(metaErr: unknown, logs: string[] | null | undefined): HumanError[] {
  const fromMeta = humanizeMetaErr(metaErr)
  const fromLogs = errorsFromLogs(logs)
  const codes = new Set(fromMeta.map((e) => e.code))
  const extras = fromLogs.filter((e) => {
    if (codes.has(e.code)) return false
    if (e.source === 'log' && fromMeta.length > 0 && e.code === 'ProgramFailed') return false
    return true
  })
  return [...fromMeta, ...extras]
}

