import { NextRequest, NextResponse } from "next/server";

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

export async function GET(req: NextRequest) {
  const sig = req.nextUrl.searchParams.get("sig");
  if (!sig) {
    return NextResponse.json({ error: "missing sig" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          sig.trim(),
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ error: "rpc_unreachable" }, { status: 502 });
  }

  if (res.status === 429) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: `http_${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
