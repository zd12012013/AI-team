/* Уровень 4 «Олимпиадный»: node tests/olympiad.js
   • у каждой задачи есть источник (реальный или «в стиле олимпиады»), 1–2 подсказки и решение;
   • подсказки открываются по одной, решение — по кнопке;
   • задачи с вводом ответа засчитываются (с запятой/точкой, без учёта регистра);
   • решение, открытое до ответа, не засчитывается;
   • проверяется на нескольких предметах (все, где уровень 4 уже обновлён). */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const BASE = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fails++; };

// предметы, где уровень 4 уже в новом формате
const DATA = path.resolve(__dirname, "..", "data");
const subjects = fs.readdirSync(DATA).filter(f => f.endsWith(".json") && f !== "index.json").map(f => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")))
  .filter(d => Object.values(d.classes).some(c => c.sections.some(s => s.topics.some(t => t.levels.olympiad.some(q => q.source)))));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(() => { window.NOVA_AI_FORCE_LITE = true; });

  for (const d of subjects) {
    console.log(`${d.name}:`);
    let total = 0, real = 0, style = 0, input = 0, bad = [];
    for (const [g, c] of Object.entries(d.classes)) for (const s of c.sections) for (const t of s.topics) for (const q of t.levels.olympiad) {
      total++;
      if (!q.source || !q.solution || !(q.hints || []).length) bad.push(t.id);
      if (q.source === "style") { style++; if (!q.check) bad.push(t.id + " (style без check)"); } else if (q.source) real++;
      if (q.answer !== undefined) input++;
    }
    ok(!bad.length, `все ${total} задач: источник, подсказки, решение` + (bad.length ? " — нет у " + bad.slice(0, 5).join(", ") : ""));
    console.log(`  · реальный источник: ${real}, «в стиле олимпиады» (check): ${style}, с вводом ответа: ${input}`);

    // Прорешиваем первую тему класса с задачами ввода: правильные ответы → 100%
    const [g, c] = Object.entries(d.classes).find(([, c]) => c.sections.some(s => s.topics.some(t => t.levels.olympiad.some(q => q.answer !== undefined))));
    const topic = c.sections.flatMap(s => s.topics).find(t => t.levels.olympiad.some(q => q.answer !== undefined));
    await page.goto(BASE + `#/q/${d.id}/${g}/${topic.id}/olympiad`); await page.waitForSelector(".question");
    for (let i = 0; i < topic.levels.olympiad.length; i++) {
      const text = await page.textContent(".question h2");
      const q = topic.levels.olympiad.find(x => text.startsWith(x.q));
      if (i === 0) {
        ok(await page.isVisible(".src"), "под задачей показан источник");
        const hb = await page.$("#hintBtn");
        if (hb) { await hb.click(); ok((await page.$$(".hint")).length === 1, "подсказка открывается по одной"); }
      }
      if (q.answer !== undefined) {
        // ответ с другим регистром и точкой вместо запятой тоже засчитывается
        await page.fill("#ansInput", String(q.answer).toUpperCase().replace(",", "."));
      } else {
        const opts = await page.$$(".option");
        for (const o of opts) if ((await o.textContent()) === q.o[q.a]) { await o.click(); break; }
      }
      await page.click("#nextQ");
    }
    await page.waitForSelector(".result-top");
    ok((await page.textContent(".result-top h2")).startsWith(`${topic.levels.olympiad.length} из`), `${topic.id}: все правильные ответы засчитаны (ввод и выбор)`);

    // Решение до ответа — не засчитывается и показывает ответ
    await page.click("#retry"); await page.waitForSelector(".question");
    await page.click("#solBtn"); await page.waitForSelector(".solution");
    ok((await page.textContent(".solution")).length > 30, "«Показать решение» показывает полное решение");
    const locked = (await page.$("#ansInput[disabled]")) || (await page.$(".option[disabled]"));
    ok(!!locked, "после просмотра решения ответить уже нельзя");
    for (let i = 0; i < topic.levels.olympiad.length; i++) {
      if (i > 0) {
        if (await page.$("#ansInput")) await page.fill("#ansInput", "неверно"); else await (await page.$$(".option"))[0].click();
      }
      await page.click("#nextQ");
    }
    await page.waitForSelector(".result-top");
    const score = +(await page.textContent(".result-top h2")).split(" ")[0];
    ok(score < topic.levels.olympiad.length, "задача с подсмотренным решением не засчитана");
    ok((await page.$$(".sol-details")).length > 0, "в ошибках есть решение и источник");
  }
  if (process.env.SHOTS) {
    await page.goto(BASE + "#/q/informatics/10/i10-complexity/olympiad"); await page.waitForSelector(".question");
    for (let i = 0; i < 3; i++) { if ((await page.textContent(".question h2")).includes("треугольник")) break; await page.fill("#ansInput", "1"); await page.click("#nextQ"); }
    await page.click("#hintBtn"); await page.click("#solBtn"); await page.waitForSelector(".solution");
    await page.screenshot({ path: process.env.SHOTS + "/olymp.png", fullPage: true });
  }
  ok(errs.length === 0, "Нет ошибок JS" + (errs.length ? ": " + errs.join("; ") : ""));
  await browser.close();
  console.log(fails ? `\nОШИБОК: ${fails}` : "\nВСЁ ОК");
  process.exit(fails ? 1 : 0);
})();
