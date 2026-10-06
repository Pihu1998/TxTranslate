"use client";

import { useState, useCallback } from "react";
import { EXAMPLE_SUCCESS_SIG, EXAMPLE_FAILED_SIG } from "@/examples";
import { fetchTransaction, isValidSignature, SolanaTransaction } from "@/lib/rpc";
import { friendlyProgram } from "@/lib/programNames";
import { getRuleExplanation, Language } from "@/lib/rules";

// ---------------------------------------------------------------------------
// i18n labels
// ---------------------------------------------------------------------------
const LABELS = {
  en: {
    tagline: "Understand your Solana transaction in plain language.",
    inputPlaceholder: "Paste a Solana transaction signature…",
    explainBtn: "Explain",
    loading: "Fetching transaction…",
    trySuccess: "✅ Try a success",
    tryFailed: "❌ Try a failure",
    status: "Status",
    success: "Success",
    failed: "Failed",
    fee: "Fee",
    programs: "Programs Invoked",
    balanceChanges: "Balance Changes",
    account: "Account",
    solChange: "SOL Change",
    tokenChanges: "Token Balance Changes",
    mint: "Mint",
    owner: "Owner",
    change: "Change",
    logs: "Raw Log Messages",
    showLogs: "Show logs",
    hideLogs: "Hide logs",
    explanation: "Plain-English Explanation",
    aiLabel: "✨ AI explanation",
    ruleLabel: "📖 Rule-based explanation",
    errorLabel: "Error",
    whatToTry: "💡 What to try next",
    errInvalidSig: "That doesn't look like a valid Solana transaction signature.",
    errNotFound: "Transaction not found. It may be too old or the signature may be wrong.",
    errRateLimit: "Rate limit hit — wait a few seconds and try again.",
    errRpc: "RPC error",
    aiLoading: "Getting AI explanation…",
  },
  th: {
    tagline: "เข้าใจธุรกรรม Solana ของคุณในภาษาที่เข้าใจง่าย",
    inputPlaceholder: "วาง Solana transaction signature ที่นี่…",
    explainBtn: "อธิบาย",
    loading: "กำลังดึงข้อมูลธุรกรรม…",
    trySuccess: "✅ ตัวอย่างที่สำเร็จ",
    tryFailed: "❌ ตัวอย่างที่ล้มเหลว",
    status: "สถานะ",
    success: "สำเร็จ",
    failed: "ล้มเหลว",
    fee: "ค่าธรรมเนียม",
    programs: "โปรแกรมที่ใช้งาน",
    balanceChanges: "การเปลี่ยนแปลงยอด SOL",
    account: "บัญชี",
    solChange: "การเปลี่ยนแปลง SOL",
    tokenChanges: "การเปลี่ยนแปลงยอด Token",
    mint: "Mint",
    owner: "เจ้าของ",
    change: "การเปลี่ยนแปลง",
    logs: "Log Messages (ดิบ)",
    showLogs: "แสดง logs",
    hideLogs: "ซ่อน logs",
    explanation: "คำอธิบายแบบเข้าใจง่าย",
    aiLabel: "✨ คำอธิบายจาก AI",
    ruleLabel: "📖 คำอธิบายจากกฎ",
    errorLabel: "ข้อผิดพลาด",
    whatToTry: "💡 สิ่งที่ควรลองต่อไป",
    errInvalidSig: "นี่ไม่ใช่ Solana transaction signature ที่ถูกต้อง",
    errNotFound: "ไม่พบธุรกรรมนี้ อาจเก่าเกินไปหรือ signature ไม่ถูกต้อง",
    errRateLimit: "ถึงขีดจำกัด RPC — รอสักครู่แล้วลองอีกครั้ง",
    errRpc: "RPC error",
    aiLoading: "กำลังรับคำอธิบายจาก AI…",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LAMPORTS = 1_000_000_000;

function lamportsToSol(lamports: number): string {
  return (lamports / LAMPORTS).toFixed(6);
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function errorToString(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  return JSON.stringify(err);
}

// Extract unique programs from instructions (handles nested inner instructions too)
function extractPrograms(tx: SolanaTransaction): string[] {
  const programIds = new Set<string>();
  const instructions = tx.transaction.message.instructions ?? [];
  for (const ix of instructions) {
    if (ix.programId) programIds.add(ix.programId);
  }
  // Also check inner instructions if present
  const meta = tx.meta as unknown as { innerInstructions?: Array<{ instructions: Array<{ programId?: string }> }> };
  if (meta?.innerInstructions) {
    for (const inner of meta.innerInstructions) {
      for (const ix of inner.instructions) {
        if (ix.programId) programIds.add(ix.programId);
      }
    }
  }
  return Array.from(programIds);
}

type BalanceRow = {
  account: string;
  pre: number;
  post: number;
  delta: number;
};

function computeBalanceChanges(tx: SolanaTransaction): BalanceRow[] {
  const keys = tx.transaction.message.accountKeys;
  return keys
    .map((key, i) => ({
      account: key.pubkey,
      pre: tx.meta.preBalances[i] ?? 0,
      post: tx.meta.postBalances[i] ?? 0,
      delta: (tx.meta.postBalances[i] ?? 0) - (tx.meta.preBalances[i] ?? 0),
    }))
    .filter((r) => r.delta !== 0);
}

type TokenRow = {
  accountIndex: number;
  mint: string;
  owner: string;
  preDelta: number;
  postDelta: number;
  change: number;
  decimals: number;
};

function computeTokenChanges(tx: SolanaTransaction): TokenRow[] {
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];

  const map = new Map<string, TokenRow>();

  for (const b of pre) {
    const key = `${b.accountIndex}:${b.mint}`;
    map.set(key, {
      accountIndex: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? "",
      preDelta: Number(b.uiTokenAmount.uiAmount ?? 0),
      postDelta: 0,
      change: 0,
      decimals: b.uiTokenAmount.decimals,
    });
  }

  for (const b of post) {
    const key = `${b.accountIndex}:${b.mint}`;
    const existing = map.get(key);
    const postAmt = Number(b.uiTokenAmount.uiAmount ?? 0);
    if (existing) {
      existing.postDelta = postAmt;
      existing.change = postAmt - existing.preDelta;
      if (!existing.owner && b.owner) existing.owner = b.owner;
    } else {
      map.set(key, {
        accountIndex: b.accountIndex,
        mint: b.mint,
        owner: b.owner ?? "",
        preDelta: 0,
        postDelta: postAmt,
        change: postAmt,
        decimals: b.uiTokenAmount.decimals,
      });
    }
  }

  return Array.from(map.values()).filter((r) => r.change !== 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Home() {
  const [lang, setLang] = useState<Language>("en");
  const L = LABELS[lang];

  const [sig, setSig] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [tx, setTx] = useState<SolanaTransaction | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const explain = useCallback(
    async (signature: string) => {
      setFetchError("");
      setTx(null);
      setAiExplanation(null);
      setLogsOpen(false);

      const trimmed = signature.trim();
      if (!trimmed) return;

      setLoading(true);
      const result = await fetchTransaction(trimmed);
      setLoading(false);

      if (!result.ok) {
        setFetchError(
          result.error === "invalid_signature"
            ? L.errInvalidSig
            : result.error === "not_found"
            ? L.errNotFound
            : result.error === "rate_limit"
            ? L.errRateLimit
            : `${L.errRpc}: ${result.message}`
        );
        return;
      }

      const txData = result.tx;
      setTx(txData);

      // Fire AI explanation in background (no key = silently skip)
      const programs = extractPrograms(txData).map(friendlyProgram);
      const solChanges = computeBalanceChanges(txData)
        .map((r) => `${shortenAddress(r.account)}: ${r.delta > 0 ? "+" : ""}${lamportsToSol(r.delta)} SOL`)
        .join("; ");
      const logs = txData.meta.logMessages ?? [];
      const errorStr = errorToString(txData.meta.err);
      const status = txData.meta.err ? "failed" : "success";

      setAiLoading(true);
      try {
        const aiRes = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            error: errorStr,
            programs,
            balanceChanges: solChanges,
            logs,
            language: lang,
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          if (data.explanation) {
            setAiExplanation(data.explanation);
          }
        }
      } catch {
        // silently fall back to rule-based
      } finally {
        setAiLoading(false);
      }
    },
    [lang, L]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    explain(sig);
  };

  // Derived data
  const failed = tx ? !!tx.meta.err : false;
  const errorStr = tx ? errorToString(tx.meta.err) : "";
  const logs = tx?.meta.logMessages ?? [];
  const programs = tx ? extractPrograms(tx) : [];
  const balanceChanges = tx ? computeBalanceChanges(tx) : [];
  const tokenChanges = tx ? computeTokenChanges(tx) : [];
  const ruleExplanation = tx
    ? getRuleExplanation(errorStr, logs, lang)
    : null;

  // Format AI explanation: split on the 💡 tip line
  let aiBody = "";
  let aiTip = "";
  if (aiExplanation) {
    const tipIdx = aiExplanation.indexOf("💡");
    if (tipIdx !== -1) {
      aiBody = aiExplanation.slice(0, tipIdx).trim();
      aiTip = aiExplanation.slice(tipIdx).trim();
    } else {
      aiBody = aiExplanation.trim();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">◎</span>
              Why Did My Tx Fail?
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{L.tagline}</p>
          </div>
          {/* Language toggle */}
          <button
            onClick={() => {
              setLang(lang === "en" ? "th" : "en");
              setAiExplanation(null);
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-purple-500 hover:text-purple-300 transition-colors"
          >
            {lang === "en" ? "🇹🇭 ไทย" : "🇬🇧 English"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              placeholder={L.inputPlaceholder}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={loading || !sig.trim()}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {loading ? "…" : L.explainBtn}
            </button>
          </div>

          {/* Example buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setSig(EXAMPLE_SUCCESS_SIG); explain(EXAMPLE_SUCCESS_SIG); }}
              className="px-3 py-1.5 text-xs rounded-lg bg-green-900/40 border border-green-700/50 text-green-300 hover:bg-green-800/50 transition-colors"
            >
              {L.trySuccess}
            </button>
            <button
              type="button"
              onClick={() => { setSig(EXAMPLE_FAILED_SIG); explain(EXAMPLE_FAILED_SIG); }}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-900/40 border border-red-700/50 text-red-300 hover:bg-red-800/50 transition-colors"
            >
              {L.tryFailed}
            </button>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-gray-400 text-sm animate-pulse">
            <span className="inline-block w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            {L.loading}
          </div>
        )}

        {/* Fetch error */}
        {fetchError && (
          <div className="rounded-xl border border-red-700/60 bg-red-900/20 px-5 py-4 text-red-300 text-sm">
            ⚠️ {fetchError}
          </div>
        )}

        {/* Result card */}
        {tx && (
          <div className="space-y-4">
            {/* Status + fee row */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">{L.status}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      failed
                        ? "bg-red-900/60 text-red-300 border border-red-700"
                        : "bg-green-900/60 text-green-300 border border-green-700"
                    }`}
                  >
                    {failed ? L.failed : L.success}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-gray-500">{L.fee}:</span>{" "}
                  <span className="text-gray-200 font-mono">
                    {lamportsToSol(tx.meta.fee)} SOL
                  </span>
                </div>
              </div>

              {/* Raw error */}
              {failed && errorStr && (
                <div className="rounded-lg bg-red-950/40 border border-red-800/40 px-4 py-3">
                  <p className="text-xs font-semibold text-red-400 mb-1">{L.errorLabel}</p>
                  <p className="text-xs text-red-200 font-mono break-all">{errorStr}</p>
                </div>
              )}

              {/* Programs */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">{L.programs}</p>
                <div className="flex flex-wrap gap-2">
                  {programs.length === 0 ? (
                    <span className="text-xs text-gray-500">—</span>
                  ) : (
                    programs.map((p) => (
                      <span
                        key={p}
                        className="px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-700/40 text-purple-200 text-xs font-mono"
                      >
                        {friendlyProgram(p)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* SOL balance changes */}
            {balanceChanges.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-xs font-semibold text-gray-400 mb-3">{L.balanceChanges}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 text-left">
                        <th className="pb-2 pr-4 font-medium">{L.account}</th>
                        <th className="pb-2 text-right font-medium">{L.solChange}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {balanceChanges.map((row) => (
                        <tr key={row.account}>
                          <td className="py-1.5 pr-4 font-mono text-gray-400">
                            {shortenAddress(row.account)}
                          </td>
                          <td
                            className={`py-1.5 text-right font-mono font-medium ${
                              row.delta > 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {row.delta > 0 ? "+" : ""}
                            {lamportsToSol(row.delta)} SOL
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Token balance changes */}
            {tokenChanges.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-xs font-semibold text-gray-400 mb-3">{L.tokenChanges}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 text-left">
                        <th className="pb-2 pr-4 font-medium">{L.mint}</th>
                        <th className="pb-2 pr-4 font-medium">{L.owner}</th>
                        <th className="pb-2 text-right font-medium">{L.change}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {tokenChanges.map((row, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 font-mono text-gray-400">
                            {shortenAddress(row.mint)}
                          </td>
                          <td className="py-1.5 pr-4 font-mono text-gray-400">
                            {row.owner ? shortenAddress(row.owner) : "—"}
                          </td>
                          <td
                            className={`py-1.5 text-right font-mono font-medium ${
                              row.change > 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {row.change > 0 ? "+" : ""}
                            {row.change.toFixed(row.decimals > 6 ? 6 : row.decimals)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Log messages (collapsible) */}
            {logs.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                <button
                  onClick={() => setLogsOpen(!logsOpen)}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <span>{L.logs}</span>
                  <span className="text-gray-600">{logsOpen ? "▲" : "▼"} {logsOpen ? L.hideLogs : L.showLogs}</span>
                </button>
                {logsOpen && (
                  <div className="border-t border-gray-800 px-5 py-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-all space-y-0.5">
                      {logs.map((line, i) => (
                        <div key={i} className={line.includes("Error") || line.includes("failed") ? "text-red-400" : ""}>
                          {line}
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Explanation block */}
            <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-5 space-y-4">
              <h2 className="text-sm font-bold text-purple-300">{L.explanation}</h2>

              {/* AI explanation */}
              {aiLoading && (
                <div className="flex items-center gap-2 text-purple-400 text-xs animate-pulse">
                  <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  {L.aiLoading}
                </div>
              )}

              {aiExplanation && !aiLoading && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-purple-400">{L.aiLabel}</p>
                  <p className="text-sm text-gray-200 leading-relaxed">{aiBody}</p>
                  {aiTip && (
                    <div className="rounded-lg bg-purple-900/30 border border-purple-700/40 px-4 py-3 text-sm text-purple-200">
                      {aiTip}
                    </div>
                  )}
                </div>
              )}

              {/* Rule-based (always shown, or fallback when no AI) */}
              {ruleExplanation && (!aiExplanation || aiLoading) && (
                <div className="space-y-3">
                  {aiLoading && <p className="text-xs font-semibold text-gray-500">{L.ruleLabel}</p>}
                  {!aiLoading && !aiExplanation && <p className="text-xs font-semibold text-gray-400">{L.ruleLabel}</p>}
                  <p className="text-base font-semibold text-white">{ruleExplanation.title}</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{ruleExplanation.detail}</p>
                  <div className="rounded-lg bg-purple-900/30 border border-purple-700/40 px-4 py-3 text-sm text-purple-200">
                    {L.whatToTry}: {ruleExplanation.fix}
                  </div>
                </div>
              )}

              {/* Show rule as secondary when AI loaded */}
              {ruleExplanation && aiExplanation && !aiLoading && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400 select-none">
                    {L.ruleLabel}
                  </summary>
                  <div className="mt-2 pl-2 border-l border-gray-800 space-y-2">
                    <p className="text-sm font-semibold text-gray-300">{ruleExplanation.title}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{ruleExplanation.detail}</p>
                    <p className="text-xs text-gray-500">{L.whatToTry}: {ruleExplanation.fix}</p>
                  </div>
                </details>
              )}

              {/* Successful tx with no specific rule */}
              {!failed && !ruleExplanation && !aiExplanation && !aiLoading && (
                <p className="text-sm text-green-300">
                  🎉 This transaction completed successfully. All instructions executed without errors.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-600">
        Built at Chiang Mai Build Lab with Superteam Thailand &nbsp;·&nbsp; Inspired by the Solana transaction-debugging idea from Colosseum Cypherpunk winner Seer
      </footer>
    </div>
  );
}
