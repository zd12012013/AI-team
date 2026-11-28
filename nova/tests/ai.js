/* Проверка NOVA AI: node tests/ai.js
   1) без WebGPU — упрощённый режим (ответы из тем NOVA и Википедии);
   2) с подменной моделью (тот же API, что у WebLLM) — загрузка с прогресс-баром,
      потоковый ответ, контекст темы/вопроса в системном промпте, подсветка C++;
   3) WEBLLM_LOCAL=путь/к/web-llm/lib/index.js — настоящая библиотека WebLLM вместо CDN
      и «видеокарта»-заглушка: модель не скачается (нет сети) → должен включиться упрощённый режим.
*/
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fails++; };

const MOCK = () => {
  window.__aiCalls = [];
  window.NOVA_AI_ENGINE = async (model, { initProgressCallback }) => {
    window.__aiModel = model;
    for (const p of [0, 0.4, 0.8, 1]) { initProgressCallback({ progress: p, text: "Fetching param cache[" + p + "]" }); await new Promise(r => setTimeout(r, 120)); }
    return {
      chat: { completions: { create: async ({ messages, stream }) => {
        window.__aiCalls.push(messages);
        const last = messages[messages.length - 1].content;
        const answer = last.includes("[ПОЛНОЕ РЕШЕНИЕ]")
          ? "**Решение по шагам:**\n1. Первый шаг\n2. Второй шаг\nОтвет: 42"
          : "Подсказка: подумай о цикле.\n```cpp\nfor (int i = 0; i < 3; i++) cout << i; // 012\n```";
        const parts = answer.match(/.{1,6}/gs);
        return (async function* () { for (const p of parts) { await new Promise(r => setTimeout(r, 5)); yield { choices: [{ delta: { content: p } }] }; } })();
      } } },
      interruptGenerate() {}
    };
  };
};

(async () => {
  const browser = await chromium.launch();

  // ---------- 1. Без WebGPU ----------
  console.log("1) Без WebGPU — упрощённый режим");
  {
    const page = await browser.newPage();
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await page.addInitScript(() => { try { Object.defineProperty(navigator, "gpu", { get: () => undefined }); } catch (e) {} });
    await page.goto(BASE + "#/t/informatics/8/i8-cpp-loops"); await page.waitForSelector(".explain-card");
    ok(await page.isVisible("#aiFab"), "Кнопка NOVA AI видна на странице темы");
    await page.click("#aiFab"); await page.waitForSelector("#aiPanel.open");
    await page.waitForFunction(() => document.querySelector("#aiMode").textContent.includes("упрощ"));
    ok((await page.textContent("#aiBody")).includes("WebGPU"), "Сообщение о том, что WebGPU нет");
    ok((await page.textContent("#aiSub")).includes("C++: циклы"), "Контекст: тема в шапке чата");
    await page.click("[data-quick=simpler]"); await page.waitForFunction(() => document.querySelectorAll(".msg.bot .ai-disc").length >= 1);
    const t1 = await page.textContent("#aiBody");
    ok(t1.includes("Цикл повторяет"), "«Объясни проще» берёт объяснение темы");
    ok(t1.includes("ИИ может ошибаться — проверяй по учебнику") && t1.includes("упрощённый режим"), "Подпись и пометка «упрощённый режим»");
    await page.click("[data-quick=example]"); await page.waitForFunction(() => document.querySelectorAll(".msg.bot pre.code").length >= 1);
    ok(true, "«Дай пример» показывает код C++ с подсветкой");
    await page.click("[data-quick=similar]"); await page.waitForFunction(() => document.querySelectorAll(".msg.bot .ai-disc").length >= 3);
    await page.click("[data-quick=solution]"); await page.waitForFunction(() => document.querySelectorAll(".msg.bot .ai-disc").length >= 4);
    ok((await page.textContent("#aiBody")).includes("Решение"), "«Похожая задача» → «Покажи решение»");
    await page.fill("#aiInput", "что такое цикл while"); await page.press("#aiInput", "Enter");
    await page.waitForFunction(() => document.querySelectorAll(".msg.bot .ai-disc").length >= 5, null, { timeout: 15000 });
    ok((await page.textContent("#aiBody")).includes("Википедия"), "Свободный вопрос: тема NOVA + Википедия (или ссылка на поиск)");
    ok(errs.length === 0, "Нет ошибок JS" + (errs.length ? ": " + errs.join("; ") : ""));
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + "/ai-lite.png" });
    await page.close();
  }

  // ---------- 2. Подменная модель ----------
  console.log("2) С WebGPU (подменная модель с API WebLLM)");
  {
    const page = await browser.newPage();
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await page.addInitScript(MOCK);
    await page.goto(BASE + "#/q/informatics/8/i8-cpp-loops/easy"); await page.waitForSelector(".question");
    await page.click(".option"); // ответим на первый вопрос
    await page.click("#aiFab"); await page.waitForSelector("#aiPanel.open");
    ok(await page.isVisible(".ai-load"), "Экран загрузки с прогресс-баром");
    ok((await page.textContent(".ai-load")).includes("Загружаем помощника (~1 ГБ, только один раз)"), "Текст «Загружаем помощника (~1 ГБ, только один раз)»");
    await page.waitForFunction(() => document.querySelector("#aiMode").textContent.includes("на устройстве"));
    ok((await page.evaluate(() => window.__aiModel)).startsWith("Qwen2.5-1.5B-Instruct"), "Модель Qwen2.5-1.5B-Instruct");
    await page.click("[data-quick=simpler]");
    await page.waitForFunction(() => document.querySelector(".msg.bot:last-child .ai-disc"));
    const sys = await page.evaluate(() => window.__aiCalls[0][0].content);
    ok(sys.includes("Объяснение темы из материалов NOVA") && sys.includes("Цикл повторяет"), "В промпт добавлено объяснение темы из data/*.json");
    ok(sys.includes("Текущий вопрос:") && sys.includes("Класс: 8"), "В промпте предмет, класс и текущий вопрос");
    ok(sys.includes("[ПОЛНОЕ РЕШЕНИЕ]") && sys.includes("не подходящие для школьников"), "Системный промпт: подсказки сначала, безопасные темы");
    ok(await page.$(".msg.bot:last-child pre.code .k"), "Потоковый ответ с подсветкой C++");
    await page.click("[data-quick=solution]");
    await page.waitForFunction(() => (document.querySelector(".msg.bot:last-child")?.textContent || "").includes("Ответ: 42"));
    ok((await page.evaluate(() => window.__aiCalls.length)) === 2, "«Покажи решение» отправляет запрос с пометкой полного решения");
    ok((await page.evaluate(() => window.__aiCalls[1].length)) === 4, "Модель помнит историю диалога");
    ok(errs.length === 0, "Нет ошибок JS" + (errs.length ? ": " + errs.join("; ") : ""));
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + "/ai-llm.png" });

    // «Объясни» у ошибки в результатах теста
    await page.goto(BASE + "#/q/physics/7/p7-density/easy"); await page.waitForSelector(".question");
    for (let i = 0; i < 20; i++) {
      const opts = await page.$$(".option"); await opts[opts.length - 1].click();
      const last = (await page.textContent("#nextQ")).includes("Завершить"); await page.click("#nextQ"); if (last) break;
    }
    await page.waitForSelector(".result-top");
    if (await page.$("[data-explain]")) {
      await page.click("[data-explain]"); await page.waitForSelector("#aiPanel.open");
      await page.waitForFunction(() => window.__aiCalls.length >= 3);
      const s2 = await page.evaluate(() => window.__aiCalls[window.__aiCalls.length - 1][0].content);
      ok(s2.includes("Ответ ученика:") && s2.includes("Физика"), "«🤖 Объясни» у ошибки передаёт вопрос и ответ ученика");
    }
    await page.close();
  }

  // ---------- 3. Настоящая библиотека WebLLM ----------
  if (process.env.WEBLLM_LOCAL) {
    console.log("3) Настоящий WebLLM из локальной копии, модель недоступна → упрощённый режим");
    const page = await browser.newPage();
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await page.route(/cdn\.jsdelivr\.net\/npm\/@mlc-ai\/web-llm/, r => r.fulfill({ contentType: "application/javascript", headers: { "access-control-allow-origin": "*" }, body: fs.readFileSync(process.env.WEBLLM_LOCAL) }));
    await page.addInitScript(() => {
      const adapter = { features: new Set(["shader-f16"]), limits: {}, info: {}, requestAdapterInfo: async () => ({}), requestDevice: async () => { throw new Error("нет видеокарты в тесте"); } };
      Object.defineProperty(navigator, "gpu", { get: () => ({ requestAdapter: async () => adapter, getPreferredCanvasFormat: () => "bgra8unorm" }) });
    });
    await page.goto(BASE + "#/t/math/5/" ); await page.waitForSelector(".mod-head");
    await page.click("#aiFab");
    await page.waitForFunction(() => document.querySelector("#aiMode").textContent.includes("упрощ"), null, { timeout: 60000 });
    const body = await page.textContent("#aiBody");
    ok(body.includes("Не удалось запустить модель"), "Библиотека загрузилась, ошибка модели → упрощённый режим: " + (body.match(/Не удалось[^.]*\./) || [""])[0].slice(0, 140));
    ok(errs.length === 0, "Нет необработанных ошибок JS" + (errs.length ? ": " + errs.join("; ") : ""));
    await page.close();
  }

  await browser.close();
  console.log(fails ? `\nОШИБОК: ${fails}` : "\nВСЁ ОК");
  process.exit(fails ? 1 : 0);
})();
