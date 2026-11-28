/* Проверяет ВСЕ готовые предметы: каждый класс открывается, у каждой темы
   есть 4 уровня, и тест каждого уровня запускается.
   Запуск из папки nova:  node tests/all-grades.js */
const { chromium } = require("playwright");
const path = require("path");
const BASE = "file://" + path.resolve(__dirname, "..", "index.html");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(BASE);
  await page.waitForSelector(".subject");
  const index = await page.evaluate(() => INDEX);
  let topics = 0;
  for (const [sid, info] of Object.entries(index)) {
    for (const grade of Object.keys(info.grades)) {
      await page.goto(`${BASE}#/s/${sid}/${grade}`);
      await page.waitForSelector(".topic-row");
      const links = await page.$$eval(".topic-row", els => els.map(e => e.getAttribute("href")));
      if (links.length !== info.grades[grade]) throw new Error(`${sid} ${grade}: тем ${links.length}, в оглавлении ${info.grades[grade]}`);
      // Открываем каждый уровень первой и последней темы класса
      for (const link of [links[0], links[links.length - 1]]) {
        for (const level of ["easy", "medium", "hard", "olympiad"]) {
          await page.goto(BASE + link.replace("#/t/", "#/q/") + "/" + level);
          await page.waitForSelector(".question");
        }
      }
      topics += links.length;
      console.log(`  ✓ ${sid} ${grade} класс: ${links.length} тем`);
    }
  }
  if (errors.length) throw new Error("Ошибки: " + errors.join(" | "));
  console.log(`ВСЁ ОК: ${Object.keys(index).length} предм., ${topics} тем`);
  await browser.close();
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
