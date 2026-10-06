import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Provider — swap this function body to change LLM providers.
// Currently targets OpenAI-compatible APIs (OpenAI, Together, Groq, etc.)
// ---------------------------------------------------------------------------
async function callLLM(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  let body: {
    status: string;
    error: string;
    programs: string[];
    balanceChanges: string;
    logs: string[];
    language: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const langNote =
    body.language === "th"
      ? "Respond entirely in Thai (ภาษาไทย)."
      : "Respond in English.";

  const prompt = `You are an expert but beginner-friendly Solana blockchain explainer. ${langNote}

Here is a summary of a Solana transaction:
- Status: ${body.status}
- Error: ${body.error || "none"}
- Programs invoked: ${body.programs.join(", ") || "unknown"}
- Balance changes: ${body.balanceChanges || "none"}
- Last log lines:
${body.logs.slice(-15).map((l) => `  ${l}`).join("\n")}

Write a 3–4 sentence plain-English explanation a beginner can understand about what happened and why it ${body.status === "failed" ? "failed" : "succeeded"}.

CRITICAL INSTRUCTIONS:
1. Do not use generic fluff like "encountered an issue" or just spit out raw JSON. Be specific based on the logs!
2. If you see a raw error like \`{"InstructionError":[5,{"Custom":7}]}\`, translate it! Explain that "InstructionError [5]" means the 6th step/instruction failed, and "Custom: 7" means the specific app or smart contract intentionally rejected it with its own internal error code #7.
3. Emphasize that custom errors (like Custom: 7) are not network issues, but are unique to that specific app (e.g. empty pool, already claimed, slippage), so they must check that app's specific documentation to see what the number means.
4. If the logs mention slippage, say the price moved too much. If they mention funds/lamports, say they didn't have enough SOL.
5. Keep it concise. Do not use jargon. Do not mention base58 addresses directly (use the friendly program names).
6. End with exactly one "What to try next" tip on a new line starting with "💡 What to try next:".`;

  try {
    const text = await callLLM(prompt, apiKey);
    return NextResponse.json({ explanation: text });
  } catch (e) {
    console.error("LLM error:", e);
    return NextResponse.json({ error: "llm_failed" }, { status: 503 });
  }
}
