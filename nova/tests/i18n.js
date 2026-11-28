/* Проверка языков РУС | ҚАЗ: node tests/i18n.js
   • переключатель в шапке, выбор сохраняется после перезагрузки;
   • в режиме ҚАЗ на основных страницах нет русских фраз интерфейса;
   • непереведённое содержимое показано по-русски с пометкой «аудармасы жоқ»,
     переведённое — по-казахски;
   • NOVA AI и Premium тоже на казахском. */
const { chromium } = require("playwright");
const path = require("path");
const BASE = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fails++; };

// Русские фразы интерфейса, которых не должно быть в режиме ҚАЗ (содержимое тем не проверяем)
const RU_UI = ["Предметы", "Настройки", "Выбери класс", "Выбери сложность", "Коротко о теме", "Вопрос 1 из", "Далее →", "Назад",
  "Инструменты", "Слабые темы", "Пройдено", "Завершить тест", "Результат", "Осталось сегодня", "Объясни проще", "Покажи решение",
  "Лимит", "Сбросить прогресс", "Попробовать Premium", "упрощённый режим", "ИИ может ошибаться", "Опыт дома", "Новая задача", "Лента анкет"];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(() => { window.NOVA_AI_FORCE_LITE = true; });
  const shot = async n => process.env.SHOTS && page.screenshot({ path: `${process.env.SHOTS}/kz-${n}.png`, fullPage: true });
  const ruLeft = async () => {
    const text = await page.evaluate(() => {
      // берём видимый текст без содержимого тем (помечено .no-tr или находится в данных)
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll(".explain-card p, .t-name, .section h3, .question h2, .option, .ai-ctx, .msg.bot, .crumbs span, .crumbs a:last-child, .mod-head p, .mod-head h1, script, #toast").forEach(e => e.remove());
      return clone.innerText;
    });
    return RU_UI.filter(p => text.includes(p));
  };

  await page.goto(BASE + "#/"); await page.waitForSelector(".subjects");
  ok((await page.textContent("#langSw")).includes("РУС") && (await page.textContent("#langSw")).includes("ҚАЗ"), "Переключатель «РУС | ҚАЗ» в шапке");
  await page.click("[data-lang=kz]"); await page.waitForFunction(() => document.documentElement.lang === "kk");
  ok((await page.textContent("#topNav")).includes("Пәндер"), "Меню на казахском");
  ok((await page.textContent(".hero")).includes("Оңай оқы"), "Главная на казахском");
  ok((await page.textContent(".subjects")).includes("Қазақстан тарихы"), "Названия предметов на казахском");
  let left = await ruLeft(); ok(!left.length, "Главная: нет русских фраз интерфейса " + (left.length ? left.join(", ") : ""));
  await shot("home");

  await page.reload(); await page.waitForSelector(".subjects");
  ok((await page.getAttribute("[data-lang=kz]", "class")).includes("on"), "Выбор языка сохраняется после перезагрузки");

  for (const [h, sel, name] of [["#/s/physics", ".grades", "Предмет"], ["#/s/physics/7", ".topics", "Класс"], ["#/t/physics/7/p7-density", ".levels", "Тема"],
                                ["#/weak", ".mod-head", "WeakPoint"], ["#/settings", "#resetProgress", "Настройки"], ["#/premium", ".plans", "Premium"],
                                ["#/hometry", ".ht-card", "HomeTry"], ["#/hometry/inertia", ".conclusion", "HomeTry тема"], ["#/tasks", "#taskForm", "Задачи"], ["#/team", ".person", "Команда"]]) {
    await page.goto(BASE + h); await page.waitForSelector(sel);
    left = await ruLeft(); ok(!left.length, `${name}: нет русских фраз интерфейса ` + (left.length ? left.join(", ") : ""));
  }
  await page.goto(BASE + "#/hometry/inertia"); await page.waitForSelector(".conclusion");
  ok((await page.textContent(".conclusion")).includes("инерция"), "HomeTry: содержимое на казахском");
  await page.goto(BASE + "#/premium"); await page.waitForSelector(".plans");
  ok((await page.textContent(".plans")).includes("Мектеп"), "Premium на казахском"); await shot("premium");

  // Тема: переведённая или нет
  const translated = await page.evaluate(async () => {
    const out = [];
    for (const sid of Object.keys(INDEX)) {
      const d = await getSubject(sid);
      for (const [g, c] of Object.entries(d.classes)) for (const s of c.sections) for (const t of s.topics) out.push({ sid, g, id: t.id, kz: !!t.kz });
    }
    return { yes: out.find(x => x.kz), no: out.find(x => !x.kz), total: out.length, kz: out.filter(x => x.kz).length };
  });
  console.log(`  · переведено тем: ${translated.kz} из ${translated.total}`);
  if (translated.no) {
    await page.goto(BASE + `#/t/${translated.no.sid}/${translated.no.g}/${translated.no.id}`); await page.waitForSelector(".levels");
    ok((await page.textContent(".explain-card")).includes("аудармасы жоқ"), "Непереведённая тема: русский текст с пометкой «аудармасы жоқ»");
  }
  if (translated.yes) {
    await page.goto(BASE + `#/t/${translated.yes.sid}/${translated.yes.g}/${translated.yes.id}`); await page.waitForSelector(".levels");
    ok(!(await page.textContent(".explain-card")).includes("аудармасы жоқ"), "Переведённая тема показана на казахском");
    await shot("topic");
    await page.click("[data-level=easy]"); await page.waitForSelector(".question");
    ok(!(await page.textContent(".question h2")).includes("аудармасы жоқ"), "Вопрос переведённой темы — на казахском");
    left = await ruLeft(); ok(!left.length, "Тест: нет русских фраз интерфейса " + (left.length ? left.join(", ") : ""));
    await shot("quiz");
  }

  // NOVA AI
  await page.click("#aiFab"); await page.waitForSelector("#aiPanel.open");
  await page.waitForFunction(() => document.querySelector("#aiMode").textContent.includes("жеңілдетілген"));
  await page.click("[data-quick=simpler]"); await page.waitForFunction(() => document.querySelectorAll(".msg.bot .ai-disc").length >= 1);
  const ai = await page.textContent("#aiPanel");
  ok(ai.includes("Бүгін қалды") && ai.includes("Қарапайым түсіндір") && ai.includes("ЖИ қателесуі мүмкін"), "NOVA AI на казахском");
  left = await ruLeft(); ok(!left.length, "NOVA AI: нет русских фраз интерфейса " + (left.length ? left.join(", ") : ""));
  await shot("ai");

  // обратно на русский
  await page.click("#aiClose");
  await page.click("[data-lang=ru]"); await page.waitForFunction(() => document.documentElement.lang === "ru");
  ok((await page.textContent("#topNav")).includes("Предметы"), "Обратное переключение на русский");
  ok(errs.length === 0, "Нет ошибок JS" + (errs.length ? ": " + errs.join("; ") : ""));
  await browser.close();
  console.log(fails ? `\nОШИБОК: ${fails}` : "\nВСЁ ОК");
  process.exit(fails ? 1 : 0);
})();
