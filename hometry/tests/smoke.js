/* Смоук-тест HomeTry (Playwright).
   Запуск из папки hometry:
     python3 -m http.server 8765 &      # или любой другой статический сервер
     node tests/smoke.js                # http://localhost:8765
     node tests/smoke.js file           # проверка открытия index.html напрямую (file://)
*/
const { chromium } = require("playwright");
const path = require("path");

const useFile = process.argv[2] === "file";
const BASE = useFile ? "file://" + path.resolve(__dirname, "..", "index.html") : "http://localhost:8765/index.html";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push("console: " + m.text()); });
  const ok = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); console.log("  ✓", msg); };
  const text = async sel => (await page.textContent(sel)) || "";

  await page.goto(BASE);
  await page.waitForSelector(".subject-card");
  ok((await page.$$(".subject-card")).length === 7, "Home: 7 предметов");

  // --- Все разделы открываются ---
  for (const r of ["scan", "chain", "collection", "quiz", "settings", "discover"]) {
    await page.goto(BASE + "#/" + r);
    await page.waitForTimeout(150);
    ok((await page.innerHTML("#view")).length > 50, `Раздел #/${r} открывается`);
  }

  // --- Демо-сценарий: История Казахстана + монета ---
  await page.goto(BASE + "#/home");
  await page.click(".subject-card[data-subject=history]");
  await page.waitForSelector(".explore-card");
  ok((await page.$$(".topic-item")).length >= 3, "История: есть темы «Учу тему»");
  await page.click(".explore-card .btn");
  await page.waitForSelector(".upload");
  await page.click(".object-btn[data-quick][data-obj=coin]");
  await page.waitForSelector(".result-card");
  ok((await text(".found h1")).includes("Монета"), "Discover: «Обнаружено: Монета»");
  ok((await text(".result-card")).includes("1993"), "Discover: связь с тенге (1993)");
  ok(await page.$(".result-card .badge-fact"), "Discover: значок «📚 Факт»");
  ok(await page.$(".result-card .source a"), "Discover: есть ссылка на источник");
  await page.click("#saveBtn");
  await page.click(".mode-tab[data-mode=unexpected]");
  ok((await text(".result-card h3")).includes("деньги"), "Режим UNEXPECTED");
  await page.click("#saveBtn");
  await page.click(".mode-tab[data-mode=challenge]");
  await page.fill("#answer", "Монеты нужны были купцам на Шёлковом пути, торговля шла через Отрар и Тараз.");
  await page.click("#checkBtn");
  ok(await page.isVisible("#sampleBox"), "CHALLENGE: показан пример хорошего ответа");
  await page.click("#saveBtn");

  await page.click("#chainBtn");
  await page.waitForSelector(".chain-card");
  await page.waitForTimeout(4500);
  const shown = await page.$$eval(".chain-card.show", els => els.length);
  ok(shown >= 4, `Connection Chain: появились ${shown} карточек`);
  ok(await page.isVisible("#chainResult.show"), "Connection Chain: итог показан");
  await page.screenshot({ path: path.join(__dirname, "shot-chain-mobile.png"), fullPage: true });

  await page.click("a[href='#/quiz'].btn");
  await page.click("#startQuiz");
  let n = 0;
  while (await page.$(".quiz-card")) {
    await page.click(".option >> nth=0");
    await page.click("#nextQ");
    n++;
  }
  ok(n >= 3 && n <= 5, `Quiz: пройдено ${n} вопросов`);
  ok(await page.$(".quiz-result"), "Quiz: результат показан");

  await page.goto(BASE + "#/collection");
  ok((await page.$$(".disc-card")).length === 3, "My Discoveries: 3 сохранённых открытия");

  // --- Режим «Учу тему» ---
  await page.goto(BASE + "#/subject/physics");
  await page.click(".topic-item[data-topic=archimedes]");
  await page.waitForSelector(".topic-card");
  ok((await text(".key-text")).includes("ρ"), "Учу тему: формула закона Архимеда");
  await page.click("button[data-step='1'].btn");
  ok((await page.$$(".home-item")).length === 3, "Найди дома: 3 предмета");
  await page.click("[data-found='0']");
  ok(await page.$(".home-item.found"), "Найди дома: отметка «Нашёл!»");
  ok(await page.$(".exp-steps li"), "Есть опыт");
  await page.click("button[data-step='2'].btn");
  ok(await page.isDisabled("#doneBtn"), "«Тема изучена» неактивна до ответов");
  for (let q = 0; q < 3; q++) await page.click(`.option[data-q='${q}'] >> nth=0`);
  await page.click("#doneBtn");
  await page.waitForTimeout(1300);
  await page.goto(BASE + "#/collection/topics");
  ok((await text("#view")).includes("Закон Архимеда"), "Тема сохранена в My Discoveries");

  await page.goto(BASE + "#/learn/kazakh-khanate");
  await page.waitForSelector(".topic-card");
  ok((await text(".topic-card")).includes("Керей"), "Тема «Казахское ханство» открывается");

  // --- Десктоп: цепочка горизонтально ---
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + "#/chain");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(__dirname, "shot-chain-desktop.png"), fullPage: true });
  await page.goto(BASE + "#/home");
  await page.screenshot({ path: path.join(__dirname, "shot-home-desktop.png") });

  ok(errors.length === 0, "Нет ошибок в консоли" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(`\nВСЁ ОК (${useFile ? "file://" : "http"})`);
})().catch(e => { console.error(e.message); process.exit(1); });
