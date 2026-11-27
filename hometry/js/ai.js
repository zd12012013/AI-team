/* =========================================================================
   HomeTry — AI-режим (необязательный)
   -------------------------------------------------------------------------
   Фото отправляется напрямую из браузера в Claude API (api.anthropic.com).
   Ключ берётся из localStorage и больше никуда не уходит.
   Ответ приходит в ТОМ ЖЕ формате, что и записи в data/objects.json,
   поэтому остальной сайт работает с ним так же, как с демо-данными.

   Почему fetch, а не официальный SDK: сайт должен работать без сборки
   (просто index.html на GitHub Pages), а SDK требует бандлер.
   ========================================================================= */

const AI_MODELS = {
  "claude-opus-5-5": "Claude Opus 5.5 (лучшее качество, по умолчанию)",
  "claude-sonnet-5-5": "Claude Sonnet 5.5 (быстрее и дешевле)",
  "claude-haiku-5-5": "Claude Haiku 5.5 (самый дешёвый)"
};
const AI_DEFAULT_MODEL = "claude-opus-5-5";

/* ---------- Системный промпт ---------- */
const AI_SYSTEM_PROMPT = `Ты — движок образовательной платформы HomeTry («Весь мир — твой учебник») для школьников 12–17 лет из Казахстана.
Ученик фотографирует обычную вещь вокруг себя и выбирает школьный предмет. Твоя задача — узнать вещь на фото и построить связь этой вещи с выбранным предметом.

ГЛАВНОЕ ПРАВИЛО — ЧЕСТНОСТЬ ФАКТОВ:
1. Каждое утверждение помечай одним из двух значков:
   - "fact" — проверяемое научное или историческое утверждение, которое есть в энциклопедиях и школьных учебниках;
   - "analogy" — логическая связь, сравнение или образ, который помогает понять идею, но НЕ является историческим или научным фактом.
   Если сомневаешься — ставь "analogy".
2. Для каждого блока с badge "fact" обязательно укажи source: название надёжного источника (энциклопедия, Википедия, Britannica, учебник) и ссылку. Для ссылок на Википедию используй формат https://ru.wikipedia.org/w/index.php?search=<Название статьи>&go=Go. Не придумывай адреса страниц, которых может не существовать. Для badge "analogy" source = null.
3. НЕ ВЫДУМЫВАЙ конкретные даты, числа, имена и цитаты. Пиши дату или число, только если ты в нём уверен и оно общеизвестно. Иначе — общая формулировка: «в Средние века», «в XIX веке», «по мнению учёных», «по распространённой версии».
4. Легенды и спорные истории так и называй: «по легенде», «есть версия».
5. Не придумывай связь любой ценой: если прямой связи нет, сделай честную аналогию с badge "analogy".

СТИЛЬ: простой дружелюбный русский язык для подростка, коротко (text — 2–4 предложения), без сложных терминов без объяснения. Для истории по возможности используй примеры из истории Казахстана и Центральной Азии, но только достоверные.

ТРИ РЕЖИМА:
- direct — прямая, очевидная связь вещи с предметом (например: носок → текстиль → производство тканей → промышленная революция);
- unexpected — неожиданная, но логичная связь (например: ложка → рычаг → механика);
- challenge — вопрос, на который ученик сам пишет объяснение связи; дай подсказку (hint) и пример хорошего ответа (sample).

ЦЕПОЧКА (chain): 4–5 шагов, первый шаг — сама вещь, последний — большая идея предмета. У каждого шага: subject (один из: history, physics, chemistry, biology, geography, math, literature — цепочка может проходить через разные предметы), badge, label (2–4 слова), text (одно короткое предложение).

МИНИ-ЗАДАНИЕ (task): безопасное, которое ученик может сделать дома или в школе за 5–15 минут. Никаких опасных опытов с огнём, кислотами, электричеством от розетки.

КВИЗ (quiz): 2 вопроса с 4 вариантами ответа, answer — индекс правильного варианта (0–3), explain — короткое объяснение.

Если на фото нельзя распознать вещь, верни recognized=false и пустые/короткие поля.
Отвечай ТОЛЬКО JSON по заданной схеме, без пояснений до или после.`;

/* ---------- JSON-схема ответа (такая же структура, как objects.json) ---------- */
const SRC_SCHEMA = {
  anyOf: [
    { type: "object", properties: { title: { type: "string" }, url: { type: "string" } }, required: ["title", "url"], additionalProperties: false },
    { type: "null" }
  ]
};
const BADGE = { type: "string", enum: ["fact", "analogy"] };
const SUBJECT = { type: "string", enum: ["history", "physics", "chemistry", "biology", "geography", "math", "literature"] };
const STEP = {
  type: "object",
  properties: { subject: SUBJECT, badge: BADGE, label: { type: "string" }, text: { type: "string" } },
  required: ["subject", "badge", "label", "text"], additionalProperties: false
};
const RESULT = {
  type: "object",
  properties: {
    title: { type: "string" }, badge: BADGE, text: { type: "string" }, source: SRC_SCHEMA,
    question: { type: "string" }, task: { type: "string" },
    chain: { type: "array", items: STEP }
  },
  required: ["title", "badge", "text", "source", "question", "task", "chain"], additionalProperties: false
};
const AI_SCHEMA = {
  type: "object",
  properties: {
    recognized: { type: "boolean" },
    name: { type: "string", description: "Название вещи по-русски, с большой буквы, например «Монета»" },
    emoji: { type: "string" },
    direct: RESULT,
    unexpected: RESULT,
    challenge: {
      type: "object",
      properties: { question: { type: "string" }, hint: { type: "string" }, sample: { type: "string" }, badge: BADGE, source: SRC_SCHEMA },
      required: ["question", "hint", "sample", "badge", "source"], additionalProperties: false
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: { q: { type: "string" }, options: { type: "array", items: { type: "string" } }, answer: { type: "integer" }, explain: { type: "string" } },
        required: ["q", "options", "answer", "explain"], additionalProperties: false
      }
    }
  },
  required: ["recognized", "name", "emoji", "direct", "unexpected", "challenge", "quiz"],
  additionalProperties: false
};

/** Уменьшает фото до maxSide пикселей и возвращает base64 JPEG (без префикса). */
function resizeImageToBase64(dataUrl, maxSide = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => reject(new Error("не удалось прочитать фото"));
    img.src = dataUrl;
  });
}

/** Достаёт JSON из текста (на случай, если модель обернула его в ```json). */
function extractJson(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("ответ не похож на JSON");
  return JSON.parse(text.slice(a, b + 1));
}

/**
 * Отправляет фото в Claude и возвращает запись в формате objects.json:
 *   { id, name, emoji, ai: true, topics: { [subject]: { direct, unexpected, challenge, quiz } } }
 */
async function analyzePhotoWithClaude(photoDataUrl, subjectId, subjectName, settings) {
  if (!settings.apiKey) throw new Error(t("error.ai.nokey"));
  const model = settings.model || AI_DEFAULT_MODEL;
  const imageB64 = await resizeImageToBase64(photoDataUrl);

  const body = {
    model,
    max_tokens: 16000,
    system: AI_SYSTEM_PROMPT,
    // effort "low": ответ быстрее и дешевле, для такой задачи этого достаточно
    output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageB64 } },
        { type: "text", text: `Школьный предмет: ${subjectName} (id: ${subjectId}). Узнай вещь на фото и построй связи для этого предмета во всех трёх режимах.` }
      ]
    }]
  };

  const headers = {
    "content-type": "application/json",
    "x-api-key": settings.apiKey,
    "anthropic-version": "2026-10-21",
    // Нужно, чтобы API разрешил запрос прямо из браузера (ключ при этом виден в этом браузере — поэтому он только твой).
    "anthropic-dangerous-direct-browser-access": "true"
  };
  // У Opus и Sonnet включаем серверный запасной вариант на случай отказа классификатора.
  if (model.includes("opus") || model.includes("sonnet")) {
    headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
    body.fallbacks = "default";
  }

  let res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });

  // Если API не принял структурированный вывод или запасной вариант — повторяем попроще.
  if (res.status === 400) {
    const simple = { ...body, output_config: { effort: "low" } };
    delete simple.fallbacks;
    const h2 = { ...headers };
    delete h2["anthropic-beta"];
    res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: h2, body: JSON.stringify(simple) });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  if (data.stop_reason === "refusal") throw new Error(t("error.ai.refusal"));

  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const parsed = extractJson(text);
  if (!parsed.recognized) throw new Error(t("error.ai.notfound"));

  // Приводим к формату objects.json
  return normalizeAiEntry(parsed, subjectId);
}

/** Проверяет и чинит ответ модели, чтобы сайт не сломался на странных данных. */
function normalizeAiEntry(p, subjectId) {
  const fixResult = r => ({
    title: String(r?.title || "Связь"),
    badge: r?.badge === "fact" ? "fact" : "analogy",
    text: String(r?.text || ""),
    source: r?.source && r.source.url ? { title: String(r.source.title || "Источник"), url: String(r.source.url) } : null,
    question: String(r?.question || ""),
    task: String(r?.task || ""),
    chain: (Array.isArray(r?.chain) ? r.chain : []).slice(0, 6).map(s => ({
      subject: SUBJECT_IDS.includes(s.subject) ? s.subject : subjectId,
      badge: s.badge === "fact" ? "fact" : "analogy",
      label: String(s.label || ""), text: String(s.text || "")
    }))
  });
  // Факт без источника превращаем в аналогию — честнее
  const honest = r => { if (r.badge === "fact" && !r.source) r.badge = "analogy"; return r; };
  const ch = p.challenge || {};
  const challenge = honest({
    question: String(ch.question || ""), hint: String(ch.hint || ""), sample: String(ch.sample || ""),
    badge: ch.badge === "fact" ? "fact" : "analogy",
    source: ch.source && ch.source.url ? { title: String(ch.source.title || "Источник"), url: String(ch.source.url) } : null
  });
  const quiz = (Array.isArray(p.quiz) ? p.quiz : [])
    .filter(q => Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
    .map(q => ({ q: String(q.q), options: q.options.map(String), answer: q.answer, explain: String(q.explain || "") }));
  return {
    id: "ai-" + Date.now(),
    name: String(p.name || "Предмет"),
    emoji: String(p.emoji || "🔎").slice(0, 4),
    ai: true,
    topics: {
      [subjectId]: { direct: honest(fixResult(p.direct)), unexpected: honest(fixResult(p.unexpected)), challenge, quiz }
    }
  };
}
