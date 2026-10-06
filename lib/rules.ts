export type Language = "en" | "th";

export interface RuleExplanation {
  title: string;
  detail: string;
  fix: string;
}

interface RuleSet {
  en: RuleExplanation;
  th: RuleExplanation;
}

const RULES: Array<{ match: (err: string, logs: string[]) => boolean; text: RuleSet }> = [
  {
    match: (err, logs) =>
      /insufficient.*(fund|lamport)/i.test(err) ||
      /insufficient.*(fund|lamport)/i.test(logs.join(" ")),
    text: {
      en: {
        title: "Insufficient funds",
        detail:
          "Your wallet didn't have enough SOL to pay for this transaction. Every transaction costs a small fee (called rent and gas), and your balance came up short.",
        fix: "Top up your wallet with a bit more SOL and try again.",
      },
      th: {
        title: "ยอด SOL ไม่เพียงพอ",
        detail:
          "กระเป๋าของคุณมี SOL ไม่พอจ่ายค่าธรรมเนียมธุรกรรมนี้ ทุกธุรกรรมบน Solana ต้องการ SOL เล็กน้อยสำหรับค่าแก๊สและค่าเช่าบัญชี",
        fix: "เติม SOL เพิ่มเข้ากระเป๋าแล้วลองใหม่อีกครั้ง",
      },
    },
  },
  {
    match: (err, logs) =>
      /slippage/i.test(err) ||
      /slippage/i.test(logs.join(" ")) ||
      /ExceededSlippage/i.test(logs.join(" ")),
    text: {
      en: {
        title: "Slippage tolerance exceeded",
        detail:
          "The price moved too much between when you sent the transaction and when it was executed. This is a safety feature that protects you from getting a much worse price than expected.",
        fix: "Increase your slippage tolerance in the DEX settings (e.g. from 0.5% to 1%), or try again when the market is less volatile.",
      },
      th: {
        title: "ราคาเปลี่ยนแปลงเกินค่า Slippage ที่กำหนด",
        detail:
          "ราคาเหรียญขยับเกินเปอร์เซ็นต์ที่คุณยอมรับได้ ระหว่างที่ส่งธุรกรรมกับตอนที่ระบบประมวลผล ระบบจึงหยุดเพื่อปกป้องคุณไม่ให้ได้ราคาที่แย่เกินไป",
        fix: "เพิ่มค่า Slippage Tolerance ในแอปที่ใช้ swap (เช่น จาก 0.5% เป็น 1%) แล้วลองใหม่",
      },
    },
  },
  {
    match: (err, logs) =>
      /blockhash.*expired/i.test(err) ||
      /blockhash.*not.*found/i.test(err) ||
      /blockhash.*expired/i.test(logs.join(" ")),
    text: {
      en: {
        title: "Blockhash expired",
        detail:
          "Your transaction took too long to be included in a block, and the reference hash it used to prove recency has expired. This is like a ticket that's no longer valid.",
        fix: "Simply try the transaction again — your wallet will automatically attach a fresh blockhash.",
      },
      th: {
        title: "Blockhash หมดอายุ",
        detail:
          "ธุรกรรมของคุณใช้เวลานานเกินไปกว่าจะถูกบันทึก และรหัสอ้างอิง (blockhash) หมดอายุเสียก่อน เหมือนตั๋วที่หมดเขตใช้งาน",
        fix: "ลองส่งธุรกรรมใหม่อีกครั้ง กระเป๋าจะสร้าง blockhash ใหม่ให้อัตโนมัติ",
      },
    },
  },
  {
    match: (err, logs) =>
      /account.*not.*found/i.test(err) ||
      /account.*not.*found/i.test(logs.join(" ")) ||
      /AccountNotFound/i.test(logs.join(" ")),
    text: {
      en: {
        title: "Account not found",
        detail:
          "The transaction tried to interact with an account (e.g. a token account) that doesn't exist yet on-chain. This often happens when you try to receive a new token for the first time.",
        fix: "Create the associated token account first, or use a DEX that handles this automatically.",
      },
      th: {
        title: "ไม่พบบัญชีที่ต้องการ",
        detail:
          "ธุรกรรมพยายามอ้างอิงบัญชี (เช่น token account) ที่ยังไม่มีอยู่บน blockchain เหตุการณ์นี้มักเกิดขึ้นเมื่อรับเหรียญใหม่เป็นครั้งแรก",
        fix: "สร้าง associated token account ก่อน หรือใช้แอป DEX ที่จัดการขั้นตอนนี้ให้อัตโนมัติ",
      },
    },
  },
  {
    match: (err, logs) =>
      /custom program error.*0x1\b/i.test(err) ||
      /custom program error.*0x1\b/i.test(logs.join(" ")),
    text: {
      en: {
        title: "Custom program error 0x1 (Insufficient funds in program)",
        detail:
          "The smart contract you interacted with ran out of tokens or funds inside its own accounts. This is error code 1 in most Solana programs.",
        fix: "The pool or vault may be empty or near-empty. Try a different route, smaller amount, or a different DEX.",
      },
      th: {
        title: "Custom program error 0x1 (ทรัพยากรในโปรแกรมไม่พอ)",
        detail:
          "Smart contract ที่คุณใช้งานมีเหรียญหรือเงินไม่พอในบัญชีของตัวเอง นี่คือ error code 1 ที่พบบ่อยในโปรแกรม Solana",
        fix: "Pool หรือ vault อาจเหลือเงินน้อยมาก ลองลดจำนวน, เปลี่ยนเส้นทาง หรือใช้ DEX อื่น",
      },
    },
  },
  {
    match: (err, logs) =>
      /compute.*budget.*exceeded/i.test(err) ||
      /exceed.*compute/i.test(logs.join(" ")) ||
      /ComputationalBudgetExceeded/i.test(logs.join(" ")),
    text: {
      en: {
        title: "Compute budget exceeded",
        detail:
          "The transaction required more computation than it was allocated. Think of it like a script that ran out of CPU time.",
        fix: "If you're using a wallet or DEX interface, try setting a higher priority fee or compute unit limit. If you're a developer, optimize your instructions.",
      },
      th: {
        title: "Compute Budget เกินกำหนด",
        detail:
          "ธุรกรรมต้องการการประมวลผลมากกว่าโควต้าที่ได้รับ เปรียบเหมือนสคริปต์ที่ใช้ CPU เกินเวลาที่กำหนด",
        fix: "ลองเพิ่ม Priority Fee หรือเพิ่ม Compute Unit Limit ในการตั้งค่าของแอป ถ้าคุณเป็น developer ให้ลดความซับซ้อนของ instructions",
      },
    },
  },
];

const FALLBACK: RuleSet = {
  en: {
    title: "Transaction failed",
    detail:
      "This transaction was rejected by the Solana network. Check the error message and log messages above for more details.",
    fix: "Review the raw error above, or try adding your LLM_API_KEY for an AI-powered explanation.",
  },
  th: {
    title: "ธุรกรรมล้มเหลว",
    detail:
      "ธุรกรรมนี้ถูกปฏิเสธโดย Solana network โปรดตรวจสอบข้อความ error และ log ด้านบนเพื่อดูรายละเอียด",
    fix: "ตรวจสอบ error ด้านบน หรือเพิ่ม LLM_API_KEY เพื่อรับคำอธิบายจาก AI",
  },
};

export function getRuleExplanation(
  errorStr: string,
  logs: string[],
  lang: Language
): RuleExplanation {
  for (const rule of RULES) {
    if (rule.match(errorStr, logs)) {
      return rule.text[lang];
    }
  }
  return FALLBACK[lang];
}
