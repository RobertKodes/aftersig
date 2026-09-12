# aftersig

Paste a Solana **transaction signature**. Optionally write the **intent** — “I / my agent asked for X”.

You get:

1. **What landed** — success/fail, slot/time, fee, compute if the meta has it, program calls in plain language (parsed instructions when the RPC gives them).
2. **Land vs intent** — if you wrote an intent: matched / partial / mismatch / unclear. Keyword heuristics against programs and ix types. Guesses are labeled guesses. No LLM in v1.
3. **Human errors** — common Solana `meta.err` shapes plus **Anchor** framework codes, plus a collapsed raw err JSON.
4. **Balance / token deltas** — SOL pre/post/Δ per account; SPL changes from `preTokenBalances` / `postTokenBalances`.
5. **Agent JSON** — downloadable `.json` with a stable schema (below).

Daily-use workbench. No wallet, no seeds, no signing, no trading. Experimenting, learning.

Live: [https://robertkodes.github.io/aftersig/](https://robertkodes.github.io/aftersig/)

## Run it

```bash
npm install
npm run dev
```

Vite is configured with `base: '/aftersig/'` (GitHub Pages project path). Dev server: open the URL Vite prints, usually `http://localhost:5173/aftersig/`.

```bash
npm run build
npm run preview
```

Preview also lives under `/aftersig/`.

Optional env (do not commit a real `.env` if it has a private RPC):

```bash
# .env
VITE_RPC_URL=https://your-browser-friendly-rpc.example
```

See `.env.example`.

## RPC note

`api.mainnet-beta.solana.com` often **403s browser Origins**. aftersig defaults to PublicNode, then hops on **403 / 429 / 502 / 503** through dRPC → Ankr → official mainnet last.

If every public node waves you off, wait a minute or pin `VITE_RPC_URL`. Sample grabs a recent successful signature from the System Program (falls back to the Token program) so you can smoke the decode path without hunting a sig.

## JSON schema (agent export)

```json
{
  "signature": "5eyk…",
  "status": "success | failed | not_found",
  "intent": "string or null",
  "verdict": "matched | partial | mismatch | unclear | null",
  "errors": [
    {
      "source": "transaction | instruction | anchor | log | unknown",
      "code": "Anchor 2006 (ConstraintSeeds)",
      "message": "readable text",
      "guess": false,
      "instructionIndex": 0,
      "raw": {}
    }
  ],
  "instructions": [
    {
      "index": 0,
      "inner": false,
      "program": "System",
      "programId": "11111111111111111111111111111111",
      "type": "transfer",
      "summary": "Transferred 0.1 SOL  Abcd… → Efgh…"
    }
  ],
  "balances": [
    {
      "account": "…",
      "preLamports": 0,
      "postLamports": 0,
      "deltaLamports": 0
    }
  ],
  "tokens": [
    {
      "account": "…",
      "mint": "…",
      "owner": "…",
      "programId": "…",
      "decimals": 6,
      "preAmount": "0",
      "postAmount": "0",
      "deltaAmount": "0",
      "preUi": "0",
      "postUi": "0",
      "deltaUi": "0"
    }
  ],
  "slot": 123,
  "blockTime": 1710000000,
  "feeLamports": 5000,
  "rpc": "https://solana-rpc.publicnode.com"
}
```

Field names are the contract. Extra keys may appear later; do not rename these.

## Pages

Static `dist/` is pushed to the `gh-pages` branch (plus `.nojekyll`). No Actions — OAuth often lacks `workflow` scope. Enable GitHub Pages on that branch if the live URL 404s.

## Voice

Human tinkerer. If something is a guess, it says so.
