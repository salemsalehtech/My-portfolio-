// ai.js — "Improve this description" in the owner's task editor: turns rough notes into a clear,
// structured task brief. Uses any OpenAI-compatible chat API; the default is Google Gemini's
// free tier (aistudio.google.com → Get API key). Groq or OpenRouter work too — set AI_API_URL
// and AI_MODEL. With no AI_API_KEY the feature is simply off (the button is hidden).
//
// ⚠ Free tiers may use what is sent to improve the provider's models — don't paste secrets.
const API_URL = () => process.env.AI_API_URL || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = () => process.env.AI_MODEL || "gemini-2.5-flash";
const aiEnabled = () => Boolean(process.env.AI_API_KEY);

const PROMPT = {
  ar: `أنت مساعد مدير فريق برمجة. حوّل ملاحظات المدير إلى وصف مهمة واضح بالعربية (لهجة مصرية مهذبة مسموحة) بصيغة Markdown بالأقسام دي بالترتيب:
## الهدف
## ليه مهم
## المطلوب بالظبط
## معايير القبول
(قائمة نقاط - [ ] يقدر المراجع يتأكد منها)
## مش مطلوب
## مراجع
لا تخترع تفاصيل تقنية غير موجودة في الملاحظات؛ لو حاجة ناقصة اكتب سؤال تحت "أسئلة مفتوحة". اكتب الوصف فقط بدون مقدمة.`,
  en: `You help a software team lead. Turn the lead's notes into a clear task brief in English Markdown with these sections, in order:
## Goal
## Why it matters
## Exactly what to do
## Acceptance criteria
(a "- [ ]" checklist a reviewer can verify)
## Out of scope
## References
Never invent technical details that are not in the notes; if something is missing, list it under "Open questions". Output only the brief.`,
};

async function improveBrief(text, lang = "ar") {
  if (!aiEnabled()) throw Object.assign(new Error("AI is not set up"), { status: 503 });
  const notes = String(text || "").trim().slice(0, 6000);
  if (!notes) throw Object.assign(new Error("Write a few notes first"), { status: 400 });
  const res = await fetch(API_URL(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(),
      temperature: 0.3,
      messages: [{ role: "system", content: PROMPT[lang === "en" ? "en" : "ar"] }, { role: "user", content: notes }],
    }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res) throw Object.assign(new Error("The AI service did not answer — try again"), { status: 502 });
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw Object.assign(new Error("The free AI limit was reached — try again in a minute"), { status: 429 });
  const out = data?.choices?.[0]?.message?.content;
  if (!res.ok || !out) {
    console.warn("AI brief failed:", res.status, data?.error?.message || "");
    throw Object.assign(new Error("The AI service did not answer — try again"), { status: 502 });
  }
  return out.trim().replace(/^```(?:markdown)?\s*|\s*```$/g, "");
}

module.exports = { improveBrief, aiEnabled };
