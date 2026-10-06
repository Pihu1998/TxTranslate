# Why Did My Tx Fail?

> Understand your Solana transaction in plain language.

A beginner-friendly Solana transaction explainer built at **Chiang Mai Build Lab** with **Superteam Thailand**.

Inspired by the Solana transaction-debugging idea from **Colosseum Cypherpunk winner Seer**.

---

## Features

- Paste any Solana transaction signature and get an instant breakdown
- Status badge (success / failed), fee, programs invoked
- SOL and token balance changes per account
- Collapsible raw log messages
- **Rule-based plain-English explanation** (no API key required) — covers the most common errors: insufficient funds, slippage, blockhash expired, account not found, custom program error 0x1, compute budget exceeded
- **Optional AI explanation** via any OpenAI-compatible LLM
- **English / Thai language toggle** — UI labels and explanations both switch
- "Try an example" buttons for a quick demo
- Dark theme, mobile-friendly

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_RPC_URL` | Optional | Solana RPC endpoint. Defaults to `https://api.mainnet-beta.solana.com`. Use a private RPC for better rate limits. |
| `LLM_API_KEY` | Optional | OpenAI (or compatible) API key. If omitted, the app silently falls back to the rule-based explanations. |

### 3. Add example transaction signatures

Open [`examples.ts`](./examples.ts) and replace the placeholder strings:

- `EXAMPLE_SUCCESS_SIG` — a recent successful Solana transaction signature
- `EXAMPLE_FAILED_SIG` — a recent failed Solana transaction signature (e.g. slippage or insufficient funds)

You can find real signatures on [Solscan](https://solscan.io) or [SolanaFM](https://solana.fm).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Swapping the LLM provider

The AI call is isolated in one function in [`app/api/explain/route.ts`](./app/api/explain/route.ts):

```ts
async function callLLM(prompt: string, apiKey: string): Promise<string> { ... }
```

Replace the fetch URL and body to use any provider (Anthropic, Together AI, Groq, Google Gemini, etc.).

---

## What you need to fill in manually

1. **`examples.ts`** — Replace `EXAMPLE_SUCCESS_SIG_REPLACE_ME` and `EXAMPLE_FAILED_SIG_REPLACE_ME` with real signatures.
2. **`.env.local`** — Add your `LLM_API_KEY` if you want AI explanations (optional).

---

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Public Solana RPC via plain `fetch` — no SDK dependency
- No database, no auth, no wallet connection
