/* =====================================================================
   NOVA AI — бесплатный помощник, который работает прямо в браузере.
   • Модель: Qwen2.5-1.5B-Instruct через WebLLM (@mlc-ai/web-llm, с CDN).
     Загружается при первом открытии чата (~1 ГБ), дальше — из кэша браузера.
   • Без WebGPU (или если загрузка не удалась) — «упрощённый режим»:
     ответы из объяснений тем NOVA и кратких статей Википедии.
   • Знает контекст: предмет, класс, тему (+ её объяснение из data/*.json),
     текущий вопрос и ошибки ученика.
   Использует общие функции и данные из index.html: $, $$, esc, store,
   SUBJECTS, DATA, quiz, PAGE, getLang, codeBlock, highlightCpp.
   ===================================================================== */
"use strict";

const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/+esm";
const AI_MODEL_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const AI_MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC"; // для видеокарт без shader-f16
const AI_HISTORY = 8;          // сколько последних сообщений помнит модель
const AI_EXPLAIN_MAX = 900;    // сколько символов объяснения темы кладём в промпт

const AI_TXT = {
  ru: {
    title: "NOVA AI", open: "Спросить NOVA AI",
    hello: "Привет! Я **NOVA AI** — помощник по учёбе. Спроси что угодно по теме или нажми кнопку ниже.",
    loading: "Загружаем помощника (~1 ГБ, только один раз)",
    loadingCache: "Запускаем помощника из памяти браузера…",
    loadingHint: "Модель работает прямо на твоём устройстве: бесплатно, а после загрузки — даже без интернета.",
    useLite: "Пока использовать упрощённый режим",
    lite: "упрощённый режим", device: "на устройстве", starting: "загрузка…",
    noGpu: "Твой браузер не поддерживает WebGPU, поэтому я работаю в **упрощённом режиме**: отвечаю по объяснениям тем NOVA и статьям Википедии. Полный помощник работает в свежих Chrome и Edge на компьютере и на многих Android-телефонах.",
    loadFail: "Не удалось запустить модель ({e}). Перехожу в **упрощённый режим**.",
    disclaimer: "ИИ может ошибаться — проверяй по учебнику",
    simpler: "Объясни проще", example: "Дай пример", check: "Проверь моё решение", similar: "Похожая задача", solution: "Покажи решение",
    placeholder: "Спроси NOVA AI…", checkPrefix: "Проверь моё решение: ",
    general: "Общий вопрос", grade: "{g} класс", yourAnswer: "Твой ответ", correct: "Правильно",
    liteSimpler: "Объясню проще:", liteNoTopic: "Открой тему или тест — и я объясню именно их. А пока вот что нашлось:",
    liteCheck: "В упрощённом режиме я не могу проверить решение целиком. Сравни свой ход решения с правильным:",
    liteSimilar: "Похожая задача из этой темы — попробуй решить сам. Ответ — по кнопке «Покажи решение».",
    liteSolution: "Решение", liteNothing: "Я не нашёл ответа в материалах NOVA. Попробуй сформулировать вопрос иначе или открой нужную тему.",
    liteExample: "Пример по теме", fromTopic: "Из темы «{t}»", wiki: "Википедия", openTopic: "Открыть тему →",
    answer: "Ответ", why: "Почему", noTask: "Сначала выбери задачу: открой тест или нажми «Похожая задача».",
    stop: "Стоп", thinking: "думаю…", errorGen: "Что-то пошло не так при ответе ({e}). Попробуй ещё раз.",
    leftToday: "Осталось сегодня: {n}", unlimited: "Premium: без ограничений",
    limitTitle: "Лимит на сегодня исчерпан", limitText: "В бесплатной версии — {n} сообщений в день. Счётчик обнулится в полночь.",
    premiumBtn: "✦ NOVA Premium",
    mistakes: "Ошибки в тесте"
  },
  kz: {
    title: "NOVA AI", open: "NOVA AI-дан сұрау",
    hello: "Сәлем! Мен **NOVA AI** — оқуға көмекшімін. Тақырып бойынша кез келген сұрақ қой немесе төмендегі батырманы бас.",
    loading: "Көмекшіні жүктеп жатырмыз (~1 ГБ, тек бір рет)",
    loadingCache: "Көмекшіні браузер жадынан іске қосып жатырмыз…",
    loadingHint: "Модель тікелей сенің құрылғыңда жұмыс істейді: тегін, ал жүктелгеннен кейін интернетсіз де.",
    useLite: "Әзірге жеңілдетілген режимді қолдану",
    lite: "жеңілдетілген режим", device: "құрылғыда", starting: "жүктелуде…",
    noGpu: "Браузерің WebGPU-ды қолдамайды, сондықтан **жеңілдетілген режимде** жұмыс істеймін: NOVA тақырыптарының түсіндірмелері мен Уикипедия мақалалары бойынша жауап беремін. Толық көмекші компьютердегі жаңа Chrome мен Edge-те және көптеген Android телефондарында жұмыс істейді.",
    loadFail: "Модельді іске қосу мүмкін болмады ({e}). **Жеңілдетілген режимге** ауысамын.",
    disclaimer: "ЖИ қателесуі мүмкін — оқулықпен тексер",
    simpler: "Қарапайым түсіндір", example: "Мысал келтір", check: "Шешімімді тексер", similar: "Ұқсас есеп", solution: "Шешімін көрсет",
    placeholder: "NOVA AI-дан сұра…", checkPrefix: "Шешімімді тексер: ",
    general: "Жалпы сұрақ", grade: "{g} сынып", yourAnswer: "Сенің жауабың", correct: "Дұрыс жауап",
    liteSimpler: "Қарапайым тілмен:", liteNoTopic: "Тақырыпты немесе тестті аш — сонда дәл соны түсіндіремін. Әзірге табылғаны:",
    liteCheck: "Жеңілдетілген режимде шешімді толық тексере алмаймын. Өз шешіміңді дұрыс шешу жолымен салыстыр:",
    liteSimilar: "Осы тақырыптан ұқсас есеп — өзің шешіп көр. Жауабы — «Шешімін көрсет» батырмасында.",
    liteSolution: "Шешімі", liteNothing: "NOVA материалдарынан жауап таппадым. Сұрақты басқаша қойып көр немесе қажетті тақырыпты аш.",
    liteExample: "Тақырып бойынша мысал", fromTopic: "«{t}» тақырыбынан", wiki: "Уикипедия", openTopic: "Тақырыпты ашу →",
    answer: "Жауабы", why: "Неге", noTask: "Алдымен есепті таңда: тестті аш немесе «Ұқсас есеп» батырмасын бас.",
    stop: "Тоқтату", thinking: "ойланып жатырмын…", errorGen: "Жауап беру кезінде қате шықты ({e}). Тағы бір рет көр.",
    leftToday: "Бүгін қалды: {n}", unlimited: "Premium: шектеусіз",
    limitTitle: "Бүгінгі лимит таусылды", limitText: "Тегін нұсқада күніне {n} хабарлама. Есептегіш түн ортасында нөлденеді.",
    premiumBtn: "✦ NOVA Premium",
    mistakes: "Тесттегі қателер"
  }
};
const at = (key, vars = {}) => {
  const s = (AI_TXT[getLang()] || AI_TXT.ru)[key] ?? AI_TXT.ru[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

/* Состояние помощника */
const nai = {
  mode: null,          // null — ещё не запускали, "loading", "llm", "lite"
  engine: null,
  history: [],         // [{role, content}] для модели
  focus: null,         // вопрос, который разбираем: {q, o, a, e, code, picked}
  similar: null,       // последняя «похожая задача» (для «Покажи решение»)
  busy: false,
  stopFlag: false,
  ctxKey: ""           // чтобы сбрасывать историю при смене темы
};

/* ---------------------------------------------------------------------
   Контекст страницы: предмет, класс, тема, вопрос, ошибки
   --------------------------------------------------------------------- */
function aiContext() {
  const c = { subject: null, grade: null, topic: null, section: null, question: null, mistakes: [] };
  const sid = quiz?.sid || PAGE.sid;
  if (!sid) return c;
  const s = SUBJECTS.find(x => x.id === sid);
  c.subject = s ? subjectName(s) : sid;
  c.sid = sid;
  c.grade = quiz?.grade || PAGE.grade || null;
  c.topic = quiz?.topic || PAGE.topic || null;
  c.section = PAGE.section || null;
  if (quiz) {
    if (!quiz.finished) {
      const q = quiz.questions[quiz.i];
      c.question = { ...q, picked: quiz.answers[quiz.i] !== null ? ansText(q, quiz.answers[quiz.i]) : null };
    }
    c.level = quiz.level;
    quiz.questions.forEach((q, i) => {
      if (quiz.answers[i] !== null && !isRight(q, quiz.answers[i]) && (quiz.finished || i !== quiz.i)) {
        c.mistakes.push({ q: qText(q), picked: ansText(q, quiz.answers[i]), correct: rightText(q) });
      }
    });
  }
  return c;
}

const ageOf = grade => (grade ? +grade + 6 : 14);
const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

function systemPrompt(c) {
  const kz = getLang() === "kz";
  const lines = [
    `Ты — NOVA AI, дружелюбный помощник по учёбе для школьников Казахстана (5–11 классы, обновлённое содержание образования).`,
    `Ученик: ${c.grade ? c.grade + " класс, примерно " + ageOf(c.grade) + " лет" : "школьник"}.`,
    kz ? `ОТВЕЧАЙ ТОЛЬКО НА КАЗАХСКОМ ЯЗЫКЕ (қазақ тілінде), простыми словами для этого возраста.`
       : `Отвечай на русском языке, простыми словами для этого возраста. Новые термины объясняй одной фразой.`,
    `Правила:`,
    `1. Объясняй своими словами и по шагам. Опирайся на объяснение темы из материалов NOVA (ниже).`,
    `2. Сначала давай подсказки и наводящие вопросы, а не готовый ответ. Полное решение и ответ показывай, только если в сообщении есть пометка [ПОЛНОЕ РЕШЕНИЕ].`,
    `3. Если ученик прислал своё решение — проверь его по шагам, найди ошибку и похвали за то, что сделано верно.`,
    `4. Если не уверен в факте, дате или формуле — прямо скажи, что не уверен, и посоветуй проверить по учебнику. Ничего не выдумывай.`,
    `5. Программный код пиши только на C++ в блоках \`\`\`cpp с короткими комментариями.`,
    `6. Формулы пиши обычным текстом (например, a² + b² = c², F = m · a), без LaTeX.`,
    `7. Отвечай коротко: не больше 8–10 предложений.`,
    `8. Не обсуждай темы, не подходящие для школьников. На вопросы не про учёбу вежливо откажись и верни разговор к учёбе. Не проси личные данные.`
  ];
  const ctx = [];
  if (c.subject) ctx.push(`Предмет: ${c.subject}. Класс: ${c.grade || "—"}.`);
  if (c.topic) {
    ctx.push(`Тема: ${topicTitle(c.topic)}.`);
    ctx.push(`Объяснение темы из материалов NOVA: ${clip(topicExplain(c.topic), AI_EXPLAIN_MAX)}`);
    if (c.topic.formula) ctx.push(`Главное по теме: ${L(c.topic, "formula")}`);
  }
  const f = nai.focus || c.question;
  if (f) {
    ctx.push(`Текущий вопрос: ${qText(f)}${f.code ? "\nКод:\n" + f.code : ""}`);
    if (f.o) ctx.push(`Варианты ответа: ${qOpts(f).join(" | ")}`);
    if (f.picked) ctx.push(`Ответ ученика: ${f.picked}`);
    if (f.o && f.a !== undefined) ctx.push(`Правильный ответ (не называй его сразу, сначала подсказки): ${qOpts(f)[f.a]}. Пояснение: ${qExpl(f) || "—"}`);
    else if (f.answer !== undefined) ctx.push(`Правильный ответ (не называй его сразу, сначала подсказки): ${f.answer}. Решение: ${clip(L(f, "solution") || qExpl(f) || "—", 600)}`);
  }
  if (c.mistakes.length) ctx.push(`Ошибки ученика в этом тесте: ` + c.mistakes.slice(0, 4).map(m => `«${clip(m.q, 120)}» — ответил «${m.picked}», правильно «${m.correct}»`).join("; "));
  if (nai.similar) ctx.push(`Последняя похожая задача, которую ты дал: ${clip(nai.similar, 400)}`);
  return lines.join("\n") + (ctx.length ? "\n\nКонтекст:\n" + ctx.join("\n") : "");
}

/* ---------------------------------------------------------------------
   Разметка ответа: ```cpp блоки с подсветкой, `код`, **жирный**, списки
   --------------------------------------------------------------------- */
function mdAi(text) {
  const parts = String(text).split("```");
  return parts.map((part, i) => {
    if (i % 2 === 1) {                     // блок кода (в т.ч. недописанный при потоковом выводе)
      const code = part.replace(/^[a-zA-Z+]*\n/, "").replace(/\n$/, "");
      return codeBlock(code);
    }
    const lines = esc(part).split("\n");
    let html = "", list = null;
    for (const line of lines) {
      const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), h = line.match(/^\s*#{1,4}\s+(.*)/);
      const want = ul ? "ul" : ol ? "ol" : null;
      if (list && want !== list) { html += `</${list}>`; list = null; }
      if (want) { if (!list) { html += `<${want}>`; list = want; } html += `<li>${(ul || ol)[1]}</li>`; continue; }
      if (h) { html += `<b class="h">${h[1]}</b><br>`; continue; }
      html += line.trim() ? line + "<br>" : "<br>";
    }
    if (list) html += `</${list}>`;
    return html
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(<br>){3,}/g, "<br><br>")
      .replace(/^(<br>)+|(<br>)+$/g, "");
  }).join("");
}

/* ---------------------------------------------------------------------
   Панель чата
   --------------------------------------------------------------------- */
function aiMsg(who, html, opts = {}) {
  const body = $("#aiBody");
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.innerHTML = html;
  if (who === "bot" && !opts.noFoot) div.insertAdjacentHTML("beforeend", aiFoot());
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}
const aiFoot = () => `<div class="ai-disc">${nai.mode === "lite" ? `<span class="lite-tag">${at("lite")}</span> · ` : ""}⚠️ ${at("disclaimer")}</div>`;

function aiHeader() {
  const c = aiContext();
  $("#aiTitle").textContent = at("title");
  $("#aiSub").textContent = c.subject ? [c.subject, c.grade ? at("grade", { g: c.grade }) : "", c.topic ? topicTitle(c.topic) : ""].filter(Boolean).join(" · ") : at("general");
  const m = $("#aiMode");
  m.textContent = nai.mode === "llm" ? "⚡ " + at("device") : nai.mode === "lite" ? at("lite") : nai.mode === "loading" ? at("starting") : "";
  m.classList.toggle("on", nai.mode === "llm");
  $("#aiInput").placeholder = at("placeholder");
  $$("[data-quick]").forEach(b => { b.textContent = at(b.dataset.quick); });
  if (typeof aiLimitRender === "function") aiLimitRender();
}

function contextCard(c) {
  const f = nai.focus || c.question;
  const mist = c.mistakes.length && !nai.focus ? `<p class="small" style="margin-top:6px"><b>${at("mistakes")}:</b> ${c.mistakes.length}</p>` : "";
  if (!f) return mist ? `<div class="ai-ctx">${mist}</div>` : "";
  return `<div class="ai-ctx">
    <p><b>${esc(qText(f))}</b></p>${f.code ? codeBlock(f.code) : ""}
    ${f.picked ? `<p style="color:var(--danger)">${at("yourAnswer")}: ${esc(f.picked)}</p>` : ""}
    ${nai.focus && f.o ? `<p style="color:var(--ok)">${at("correct")}: ${esc(qOpts(f)[f.a])}</p>` : ""}${mist}
  </div>`;
}

/** Открыть чат. focus — разбираемый вопрос (кнопка «🤖 Объясни» у ошибки). */
async function openNovaAI(focus = null) {
  const c = aiContext();
  const key = [c.sid, c.grade, c.topic?.id, focus?.q || ""].join("|");
  if (key !== nai.ctxKey) {           // новая тема или вопрос — начинаем разговор заново
    nai.ctxKey = key; nai.history = []; nai.similar = null; nai.focus = focus;
    $("#aiBody").innerHTML = contextCard(c);
    if (!focus) aiMsg("bot", mdAi(at("hello")), { noFoot: true });
  }
  $("#aiPanel").classList.add("open");
  $("#aiPanel").setAttribute("aria-hidden", "false");
  $("#aiBackdrop").classList.add("open");
  $("#aiFab").classList.add("hidden");
  aiHeader();
  if (!nai.mode) await startEngine();
  if (!aiCanSend()) return aiLimitCard();
  if (focus && !nai.history.length) aiAsk("why");
}

function closeNovaAI() {
  $("#aiPanel").classList.remove("open");
  $("#aiPanel").setAttribute("aria-hidden", "true");
  $("#aiBackdrop").classList.remove("open");
  $("#aiFab").classList.remove("hidden");
}

/* ---------------------------------------------------------------------
   Запуск модели WebLLM
   --------------------------------------------------------------------- */
async function webgpuInfo() {
  try {
    if (!("gpu" in navigator)) return null;
    const adapter = await navigator.gpu.requestAdapter();
    return adapter ? { f16: adapter.features.has("shader-f16") } : null;
  } catch (e) { return null; }
}

async function startEngine() {
  // Для автотестов: window.NOVA_AI_FORCE_LITE — сразу упрощённый режим;
  // window.NOVA_AI_ENGINE — подменная модель с тем же API, что у WebLLM.
  if (window.NOVA_AI_FORCE_LITE) return useLite(at("noGpu"));
  const gpu = window.NOVA_AI_ENGINE ? { f16: true } : await webgpuInfo();
  if (!gpu) return useLite(at("noGpu"));

  nai.mode = "loading"; aiHeader();
  const model = gpu.f16 ? AI_MODEL_F16 : AI_MODEL_F32;
  const card = aiMsg("bot", `
    <div class="ai-load">
      <b id="aiLoadTitle">${at("loading")}</b>
      <div class="progress"><i id="aiLoadBar" style="width:0%"></i></div>
      <small id="aiLoadText">0%</small>
      <p class="small muted">${at("loadingHint")}</p>
      <button class="btn btn-sm btn-ghost" id="aiUseLite">${at("useLite")}</button>
    </div>`, { noFoot: true });
  let cancelled = false;
  $("#aiUseLite").onclick = () => { cancelled = true; card.remove(); useLite(); };
  try {
    const webllm = window.NOVA_AI_ENGINE ? null : await import(WEBLLM_URL);
    if (webllm && (await webllm.hasModelInCache(model).catch(() => false))) $("#aiLoadTitle").textContent = at("loadingCache");
    const onProgress = r => {
      const p = Math.round((r.progress || 0) * 100);
      const bar = $("#aiLoadBar"), txt = $("#aiLoadText");
      if (bar) bar.style.width = p + "%";
      if (txt) txt.textContent = p + "% · " + (r.text || "").slice(0, 90);
    };
    const engine = window.NOVA_AI_ENGINE
      ? await window.NOVA_AI_ENGINE(model, { initProgressCallback: onProgress })
      : await webllm.CreateMLCEngine(model, { initProgressCallback: onProgress });
    if (cancelled) return;
    nai.engine = engine; nai.mode = "llm";
    card.remove(); aiHeader();
  } catch (e) {
    if (cancelled) return;
    console.warn("WebLLM:", e);
    card.remove();
    useLite(at("loadFail", { e: clip(e.message || String(e), 120) }));
  }
}

function useLite(note) {
  nai.mode = "lite"; nai.engine = null; aiHeader();
  if (note) aiMsg("bot", mdAi(note), { noFoot: true });
}

/* ---------------------------------------------------------------------
   Вопросы к помощнику
   --------------------------------------------------------------------- */
const QUICK_PROMPT = {
  why: "Объясни, почему мой ответ неверный и как рассуждать правильно. Сначала подсказка, без готового ответа.",
  simpler: g => `Объясни это проще, как будто мне ${ageOf(g)} лет, с примером из жизни.`,
  example: "Дай один понятный пример по этой теме (если это программирование — короткий пример кода на C++ с комментариями).",
  similar: "Придумай одну похожую задачу для тренировки по этой теме. Напиши только условие, без ответа и решения.",
  solution: "[ПОЛНОЕ РЕШЕНИЕ] Покажи полное решение по шагам и ответ (для текущего вопроса или последней похожей задачи)."
};

/** Кнопки быстрых действий и свой текст. kind: why|simpler|example|similar|solution|text */
async function aiAsk(kind, userText = "") {
  if (nai.busy) return;
  if (!aiCanSend()) return aiLimitCard();
  if (!nai.mode || nai.mode === "loading") return;
  const c = aiContext();
  const label = kind === "text" ? userText : kind === "why" ? null : at(kind);
  if (label) aiMsg("me", esc(label));
  aiSpend();
  nai.busy = true;
  try {
    if (nai.mode === "llm") await llmAnswer(kind, userText, c);
    else await liteAnswer(kind, userText, c);
  } finally {
    nai.busy = false;
    aiHeader();
  }
}

async function llmAnswer(kind, userText, c) {
  const p = QUICK_PROMPT[kind];
  const content = kind === "text" ? userText : typeof p === "function" ? p(c.grade) : p;
  nai.history.push({ role: "user", content });
  const messages = [{ role: "system", content: systemPrompt(c) }, ...nai.history.slice(-AI_HISTORY)];
  const div = aiMsg("bot", `<span class="typing"><span></span><span></span><span></span></span>`, { noFoot: true });
  const stopBtn = $("#aiStop"); stopBtn.hidden = false; nai.stopFlag = false;
  let text = "", raf = 0;
  const paint = () => { raf = 0; div.innerHTML = mdAi(text); $("#aiBody").scrollTop = $("#aiBody").scrollHeight; };
  try {
    const stream = await nai.engine.chat.completions.create({ messages, stream: true, temperature: 0.4, max_tokens: 700 });
    for await (const chunk of stream) {
      text += chunk.choices?.[0]?.delta?.content || "";
      if (!raf) raf = requestAnimationFrame(paint);
      if (nai.stopFlag) { nai.engine.interruptGenerate?.(); break; }
    }
    cancelAnimationFrame(raf); paint();
    div.insertAdjacentHTML("beforeend", aiFoot());
    nai.history.push({ role: "assistant", content: text });
    if (kind === "similar") nai.similar = text;
  } catch (e) {
    console.warn(e);
    nai.history.pop();
    div.innerHTML = mdAi(at("errorGen", { e: clip(e.message || String(e), 100) }));
  } finally {
    stopBtn.hidden = true;
  }
}

/* ---------------------------------------------------------------------
   Упрощённый режим: материалы NOVA + Википедия
   --------------------------------------------------------------------- */
/** Правильный ответ вопроса: вариант (o[a]) или ответ задачи с вводом (answer). */
const ansOf = q => (q.o ? qOpts(q)[q.a ?? 0] : q.answer);
const sentences = (t, n) => (t || "").split(/(?<=[.!?])\s+/).slice(0, n).join(" ");

async function liteAnswer(kind, userText, c) {
  const t = c.topic;
  const f = nai.focus || c.question;
  const typing = aiMsg("bot", `<span class="typing"><span></span><span></span><span></span></span>`, { noFoot: true });
  let html = "";
  if (kind === "why" && f) {
    html = mdAi(`**${at("correct")}: ${ansOf(f)}**\n\n${qExpl(f) || ""}`) + (t ? mdAi(`\n**${at("fromTopic", { t: topicTitle(t) })}:** ${sentences(topicExplain(t), 3)}`) : "");
  } else if (kind === "simpler") {
    html = t ? mdAi(`**${at("liteSimpler")}** ${sentences(topicExplain(t), 2)}${f && qExpl(f) ? "\n\n💡 " + qExpl(f) : ""}${t.formula ? "\n\n**" + L(t, "formula") + "**" : ""}`)
             : mdAi(at("liteNoTopic")) + await wikiHtml(userText || c.subject || "");
  } else if (kind === "example") {
    const ex = t?.examples?.[0];
    const q = t && (topicLevels(t).easy || [])[0];
    html = ex ? `<b>${at("liteExample")}: ${esc(L(ex, "title"))}</b>${codeBlock(ex.code)}<p class="small">→ ${esc(ex.out)}</p>`
         : q ? mdAi(`**${at("liteExample")}:** ${qText(q)}\n**${at("answer")}:** ${ansOf(q)}. ${qExpl(q)}`)
         : mdAi(at("liteNoTopic")) + await wikiHtml(c.subject || "");
  } else if (kind === "check") {
    html = f ? mdAi(`${at("liteCheck")}\n\n**${at("answer")}: ${ansOf(f)}**\n${L(f, "solution") || qExpl(f) || ""}`) : mdAi(at("noTask"));
  } else if (kind === "similar") {
    const pool = t ? Object.values(topicLevels(t)).flat().filter(q => q.q !== f?.q && q.q !== nai.similarQ?.q) : [];
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (q) {
      nai.similarQ = q; nai.similar = q.q;
      html = mdAi(`${at("liteSimilar")}\n\n**${qText(q)}**`) + (q.code ? codeBlock(q.code) : "") + (q.o ? `<ul>${qOpts(q).map(o => `<li>${esc(o)}</li>`).join("")}</ul>` : "");
    } else html = mdAi(at("noTask"));
  } else if (kind === "solution") {
    const q = nai.similarQ && nai.similar === nai.similarQ.q ? nai.similarQ : f;
    html = q ? mdAi(`**${at("liteSolution")}:** ${ansOf(q)}\n\n${L(q, "solution") || qExpl(q) || ""}`) : mdAi(at("noTask"));
  } else {
    html = await liteSearch(userText, c);
  }
  typing.remove();
  aiMsg("bot", html);
}

/** Свободный вопрос: ищем подходящую тему в загруженных предметах + статью Википедии. */
async function liteSearch(text, c) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length > 3);
  let best = null, bestScore = 0;
  for (const [sid, data] of Object.entries(DATA)) {
    for (const [g, cls] of Object.entries(data.classes || {})) {
      for (const sec of cls.sections) for (const t of sec.topics) {
        const hay = (topicTitle(t) + " " + topicExplain(t)).toLowerCase();
        let score = words.reduce((s, w) => s + (hay.includes(w.slice(0, Math.max(4, w.length - 2))) ? 1 : 0), 0);
        if (sid === c.sid) score += 0.5;
        if (score > bestScore) { bestScore = score; best = { sid, g, t }; }
      }
    }
  }
  let html = "";
  if (best && bestScore >= 1) {
    html += mdAi(`**${at("fromTopic", { t: topicTitle(best.t) })}:** ${sentences(topicExplain(best.t), 3)}`) +
      `<p><a href="#/t/${best.sid}/${best.g}/${best.t.id}">${at("openTopic")}</a></p>`;
  }
  html += await wikiHtml(text);
  return html || mdAi(at("liteNothing"));
}

async function wikiHtml(query) {
  if (!query) return "";
  const host = getLang() === "kz" ? "kk.wikipedia.org" : "ru.wikipedia.org";
  try {
    const s = await (await fetch(`https://${host}/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=${encodeURIComponent(query)}`)).json();
    const hits = s.query?.search || [];
    if (!hits.length) throw new Error("нет результатов");
    const e = await (await fetch(`https://${host}/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=4&format=json&origin=*&titles=${encodeURIComponent(hits[0].title)}`)).json();
    const extract = Object.values(e.query?.pages || {})[0]?.extract || "";
    const link = t => `https://${host}/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
    return (extract ? mdAi(`**${at("wiki")}: «${hits[0].title}»** — ${extract}`) : "") +
      `<div class="sources">${hits.map(h => `<a href="${link(h.title)}" target="_blank" rel="noopener">${at("wiki")}: ${esc(h.title)} ↗</a>`).join("")}</div>`;
  } catch (err) {
    return `<div class="sources"><a href="https://${host}/w/index.php?search=${encodeURIComponent(query)}" target="_blank" rel="noopener">${at("wiki")}: ${esc(query)} ↗</a></div>`;
  }
}

/* ---------------------------------------------------------------------
   Обработчики
   --------------------------------------------------------------------- */
$("#aiFab").onclick = () => openNovaAI();
$("#aiClose").onclick = closeNovaAI;
$("#aiBackdrop").onclick = closeNovaAI;
$("#aiStop").onclick = () => { nai.stopFlag = true; };
document.addEventListener("keydown", e => { if (e.key === "Escape") closeNovaAI(); });
$$("[data-quick]").forEach(b => b.onclick = () => {
  if (b.dataset.quick === "check") {
    const inp = $("#aiInput");
    if (!inp.value.startsWith(at("checkPrefix"))) inp.value = at("checkPrefix") + inp.value;
    inp.focus();
    return;
  }
  aiAsk(b.dataset.quick);
});
$("#aiForm").onsubmit = e => {
  e.preventDefault();
  const inp = $("#aiInput");
  const text = inp.value.trim();
  if (!text || nai.busy) return;
  inp.value = "";
  aiAsk(text.startsWith(at("checkPrefix")) && nai.mode === "lite" ? "check" : "text", text);
};

/* Лимит сообщений — заглушки (настоящий лимит подключается в js/limit.js) */
if (typeof aiCanSend !== "function") { window.aiCanSend = () => true; window.aiSpend = () => {}; window.aiLimitCard = () => {}; }
window.addEventListener("hashchange", closeNovaAI); // перешли на другую страницу — чат закрывается (разговор сохраняется до смены темы)
