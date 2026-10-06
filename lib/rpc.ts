export interface SolanaTransaction {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown;
    fee: number;
    logMessages: string[] | null;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances: TokenBalance[];
    postTokenBalances: TokenBalance[];
  };
  transaction: {
    message: {
      accountKeys: AccountKey[];
      instructions: Instruction[];
    };
  };
}

export interface AccountKey {
  pubkey: string;
  signer: boolean;
  writable: boolean;
}

export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    uiAmount: number | null;
    decimals: number;
    amount: string;
    uiAmountString: string;
  };
}

export interface Instruction {
  programId: string;
  program?: string;
  parsed?: unknown;
  accounts?: string[];
  data?: string;
}

export type FetchTxResult =
  | { ok: true; tx: SolanaTransaction }
  | { ok: false; error: "invalid_signature" | "not_found" | "rate_limit" | "rpc_error"; message: string };

/** Basic base-58 signature check (88 chars, alphanumeric no 0/O/I/l). */
export function isValidSignature(sig: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(sig.trim());
}

export async function fetchTransaction(signature: string): Promise<FetchTxResult> {
  if (!isValidSignature(signature)) {
    return { ok: false, error: "invalid_signature", message: "That doesn't look like a valid Solana transaction signature." };
  }

  let res: Response;
  try {
    res = await fetch(`/api/tx?sig=${encodeURIComponent(signature.trim())}`, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return { ok: false, error: "rpc_error", message: "Could not reach the Solana RPC. Check your connection." };
  }

  if (res.status === 429) {
    return { ok: false, error: "rate_limit", message: "Rate limit hit. Wait a few seconds and try again." };
  }

  if (!res.ok) {
    return { ok: false, error: "rpc_error", message: `RPC returned HTTP ${res.status}.` };
  }

  const json = await res.json();

  if (json.error) {
    const msg: string = typeof json.error === "string" ? json.error : JSON.stringify(json.error);
    if (/rate/i.test(msg)) {
      return { ok: false, error: "rate_limit", message: "Rate limit hit. Please wait a moment and try again." };
    }
    return { ok: false, error: "rpc_error", message: msg };
  }

  if (json.result === null) {
    return { ok: false, error: "not_found", message: "Transaction not found. It may be too old, or the signature may be wrong." };
  }

  return { ok: true, tx: json.result as SolanaTransaction };
}
