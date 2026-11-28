/* Смоук-тест NOVA (Playwright).
   Запуск из папки nova:
     node tests/smoke.js            — открывает index.html напрямую (file://)
     node tests/smoke.js http://localhost:8000/   — через локальный сервер
   Проверяет: Предмет → Класс → Тема → Сложность → Тест → Результат → «Объясни»,
   прогресс, WeakPoint, настройки и старые модули. */
const { chromium } = require("playwright");
const path = require("path");

const BASE = process.argv[2] || "file://" + path.resolve(__dirname, "..", "index.html");
const SHOTS = process.env.SHOTS || "";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/wikipedia|Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  page.on("dialog", d => d.accept());
  const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ✓", m); };
  const go = async (hash, sel) => { await page.goto(BASE + hash); await page.waitForSelector(sel); };
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true }); };

  await go("#/", ".subject");
  ok((await page.$$(".subject")).length === 10, "Главная: 10 предметов");
  await shot("home");

  // Предмет → Класс
  await page.click("a.subject[href='#/s/physics']");
  await page.waitForSelector(".grade");
  const grades = await page.$$eval(".grade .g-num", els => els.map(e => e.textContent));
  ok(grades.join(",") === "7,8,9,10,11", "Физика: классы 7–11");

  // Класс → Темы
  await page.click(".grade[href='#/s/physics/7']");
  await page.waitForSelector(".topic-row");
  ok((await page.$$(".section")).length >= 3, "7 класс: темы сгруппированы по разделам");
  await shot("grade");

  // Тема → Сложность
  await page.click(".topic-row[href='#/t/physics/7/p7-density']");
  await page.waitForSelector(".level");
  ok((await page.$$(".level")).length === 4, "Тема: 4 уровня сложности");
  ok((await page.textContent(".explain-card")).includes("Плотность"), "Тема: есть объяснение");

  // Сложность → Тест (специально отвечаем так, чтобы были ошибки)
  await page.click("[data-level=easy]");
  await page.waitForSelector(".question");
  let n = 0;
  while (await page.$(".question")) {
    await page.click(".option >> nth=" + (n % 2 ? 0 : 1));
    await page.click("#nextQ");
    n++;
  }
  await page.waitForSelector(".ring");
  ok(n >= 3, `Тест: ${n} вопросов, есть результат`);
  await shot("result");

  // «Объясни»
  const explain = await page.$("[data-explain]");
  if (explain) {
    await explain.click();
    await page.waitForSelector("#aiPanel.open .msg.bot");
    ok((await page.textContent("#aiBody")).includes("Правильно"), "Объясни: пояснение из материалов");
    await page.waitForTimeout(1500);
    await shot("ai");
    await page.click("#aiClose");
  } else console.log("  (ошибок не было — панель не проверена)");

  // Сдаём лёгкий уровень на 100%, чтобы тема отметилась
  await go("#/t/physics/7/p7-density", ".level");
  const correct = await page.evaluate(async () => {
    const d = await getSubject("physics");
    return findTopic(d, 7, "p7-density").topic.levels.easy.map(q => q.o[0]);
  });
  await page.click("[data-level=easy]");
  await page.waitForSelector(".question");
  while (await page.$(".question")) {
    const opts = await page.$$eval(".option", els => els.map(e => e.textContent));
    const k = opts.findIndex(o => correct.includes(o));
    await page.click(".option >> nth=" + k);
    await page.click("#nextQ");
  }
  await page.waitForSelector(".ring");
  ok((await page.textContent(".ring")).includes("100%"), "Тест сдан на 100%");

  await go("#/s/physics/7", ".topic-row");
  ok(await page.$(".topic-row.done[href='#/t/physics/7/p7-density']"), "Галочка у пройденной темы");
  const pct = await page.textContent(".big-progress .pct");
  ok(pct !== "0%", "Процент по классу: " + pct);
  await go("#/s/physics", ".grade");
  ok((await page.textContent(".card")).includes("1 из"), "Процент по предмету");

  // WeakPoint
  await go("#/weak", ".mod-head");
  ok((await page.$$(".stat")).length === 4, "WeakPoint: статистика");
  await shot("weak");

  // Прочее
  await go("#/settings", "#resetProgress");
  ok(!(await page.$("input[type=password]")), "Настройки: поля API-ключа нет");
  ok(!(await page.content()).includes("api.anthropic.com"), "Нет запросов к платным API");
  await go("#/s/chemistry", ".mod-head");
  ok(true, "Неготовый предмет показывает заглушку");
  for (const [h, sel] of [["#/hometry", ".ht-card"], ["#/tasks", "#taskForm"], ["#/team", ".person"]]) { await go(h, sel); ok(true, h + " работает"); }

  await page.setViewportSize({ width: 1280, height: 860 });
  await go("#/", ".subject");
  await page.waitForTimeout(500);
  await shot("home-desktop");

  ok(errors.length === 0, "Нет ошибок в консоли" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log("\nВСЁ ОК: " + BASE);
})().catch(e => { console.error(e.message); process.exit(1); });
