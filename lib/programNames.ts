// Friendly display names for well-known Solana program addresses.
export const PROGRAM_NAMES: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token-2022 Program",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8bv: "Associated Token Program",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter",
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "Jupiter v4",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLMM",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo",
  Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: "Memo (v1)",
  ComputeBudget111111111111111111111111111111: "Compute Budget",
  Vote111111111111111111111111111111111111111h: "Vote Program",
  Stake11111111111111111111111111111111111111: "Stake Program",
  BPFLoaderUpgradeab1e11111111111111111111111: "BPF Loader",
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: "Metaplex Token Metadata",
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "Marinade",
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: "Marinade Finance",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpool",
  DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1: "Orca Aquafarm",
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: "Serum DEX v3",
  PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: "Phoenix DEX",
};

/** Return a friendly label or a shortened address (first 4…last 4). */
export function friendlyProgram(address: string): string {
  return PROGRAM_NAMES[address] ?? `${address.slice(0, 4)}…${address.slice(-4)}`;
}
