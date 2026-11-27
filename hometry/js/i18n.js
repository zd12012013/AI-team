/* =========================================================================
   HomeTry — ВСЕ ТЕКСТЫ ИНТЕРФЕЙСА
   -------------------------------------------------------------------------
   Чтобы добавить язык:
     1. Скопируй блок `ru` и назови, например, `kk`.
     2. Переведи значения (ключи не трогай).
     3. Если какого-то ключа нет в переводе, сайт покажет русский вариант.
   Язык выбирается в Настройках и сохраняется в localStorage.
   Внимание: контент предметов и тем (data/*.json) пока только на русском.
   ========================================================================= */

const I18N = {
  ru: {
    "app.slogan": "Весь мир — твой учебник",
    "app.tagline": "AI Discovery Learning Platform: учись, исследуя всё вокруг",

    "nav.home": "Главная",
    "nav.scan": "Скан",
    "nav.chain": "Цепочка",
    "nav.collection": "Коллекция",
    "nav.quiz": "Квиз",
    "nav.settings": "Настройки",

    "mode.demo": "Демо-режим",
    "mode.ai": "AI-режим",

    /* Home */
    "home.hero.title": "Носок, ложка или монета — всё может научить",
    "home.hero.text": "Выбери школьный предмет, сфотографируй любую вещь вокруг — и HomeTry найдёт, как она связана с темой урока.",
    "home.step1": "Выбери предмет",
    "home.step2": "Сфотографируй вещь",
    "home.step3": "Открой связь",
    "home.choose": "Какой предмет изучаем?",
    "home.demo.title": "Быстрый старт для жюри",
    "home.demo.text": "Демо-сценарий: История Казахстана + монета → цепочка → квиз.",
    "home.demo.btn": "▶ Запустить демо",

    /* Subjects */
    "subject.history": "История",
    "subject.history.sub": "в т.ч. История Казахстана",
    "subject.physics": "Физика",
    "subject.physics.sub": "силы, свет, энергия",
    "subject.chemistry": "Химия",
    "subject.chemistry.sub": "вещества и реакции",
    "subject.biology": "Биология",
    "subject.biology.sub": "живые организмы",
    "subject.geography": "География",
    "subject.geography.sub": "Земля и страны",
    "subject.math": "Математика",
    "subject.math.sub": "числа и фигуры",
    "subject.literature": "Литература",
    "subject.literature.sub": "книги, сказки, слова",

    /* Subject page */
    "subject.how": "Как будем учиться?",
    "subject.explore.title": "🔍 Исследовать вещь",
    "subject.explore.text": "Сфотографируй предмет вокруг — найдём его связь с предметом «{subject}».",
    "subject.explore.btn": "Перейти к скану",
    "subject.learn.title": "📘 Учу тему",
    "subject.learn.text": "Выбери тему из школьной программы: правило, «Найди дома», опыт и проверка.",
    "subject.topic.done": "✅ изучена",
    "subject.change": "← Другой предмет",

    /* Learn topic */
    "learn.step.card": "Карточка",
    "learn.step.home": "Найди дома",
    "learn.step.check": "Проверка",
    "learn.rule": "Главное простыми словами",
    "learn.home.title": "🏠 Найди дома",
    "learn.home.text": "Эти вещи наверняка есть у тебя дома — на них видно тему.",
    "learn.home.found": "Нашёл!",
    "learn.home.explore": "Исследовать →",
    "learn.exp.title": "🧪 Опыт или наблюдение",
    "learn.exp.observe": "Что ты увидишь и почему",
    "learn.exp.show": "Показать объяснение",
    "learn.next.home": "Дальше: найди дома →",
    "learn.next.check": "Дальше: проверь себя →",
    "learn.check.title": "✍️ Проверь себя: 3 вопроса",
    "learn.done.btn": "🎓 Тема изучена",
    "learn.done.need": "Ответь на все 3 вопроса, чтобы отметить тему.",
    "learn.done.saved": "Тема сохранена в «Мою коллекцию»!",
    "learn.done.already": "Тема уже отмечена как изученная. Можно пройти ещё раз.",
    "learn.back": "← К темам",
    "learn.score": "Правильно: {n} из {total}",

    /* Scan */
    "scan.title": "Сканируй предмет",
    "scan.subject": "Предмет:",
    "scan.nosubject": "Сначала выбери предмет на главной",
    "scan.upload": "📷 Сфотографировать или загрузить фото",
    "scan.upload.hint": "На телефоне откроется камера",
    "scan.what": "Что на фото?",
    "scan.what.hint": "В демо-режиме выбери предмет вручную — так сайт работает без интернета.",
    "scan.ai.btn": "✨ Распознать с помощью AI",
    "scan.ai.loading": "Claude рассматривает фото и ищет связи…",
    "scan.quick": "Или выбери демо-предмет:",
    "scan.ai.off": "AI-режим выключен. Включи его в настройках, чтобы фото распознавал Claude.",

    /* Discover */
    "discover.found": "Обнаружено:",
    "discover.in": "в предмете",
    "discover.modes": "Режим обучения",
    "discover.mode.direct": "DIRECT",
    "discover.mode.direct.sub": "прямая связь",
    "discover.mode.unexpected": "UNEXPECTED",
    "discover.mode.unexpected.sub": "неожиданная связь",
    "discover.mode.challenge": "CHALLENGE",
    "discover.mode.challenge.sub": "объясни сам",
    "discover.question": "🤔 Интересный вопрос",
    "discover.task": "🎯 Мини-задание",
    "discover.source": "Источник:",
    "discover.nosource": "Аналогия — это логическая связь, а не исторический факт, поэтому источник не нужен.",
    "discover.chain": "🔗 Показать цепочку знаний",
    "discover.save": "⭐ Сохранить в коллекцию",
    "discover.saved": "✓ Сохранено",
    "discover.challenge.your": "Твоё объяснение",
    "discover.challenge.placeholder": "Напиши, как ты думаешь, связаны эти вещи…",
    "discover.challenge.hint": "Подсказка",
    "discover.challenge.check": "Сравнить с примером",
    "discover.challenge.sample": "Пример хорошего ответа",
    "discover.challenge.short": "Напиши хотя бы одно-два предложения — так интереснее сравнивать!",
    "discover.challenge.feedback": "Сравни свой ответ с примером: какие идеи совпали, а что можно добавить?",
    "discover.empty": "Сначала отсканируй предмет.",
    "discover.ai": "Сгенерировано AI — перепроверь факты по источнику",

    /* Badges */
    "badge.fact": "📚 Факт",
    "badge.analogy": "💡 Аналогия",

    /* Chain */
    "chain.title": "Connection Chain",
    "chain.subtitle": "Как одна вещь ведёт к большим знаниям",
    "chain.replay": "↻ Повторить анимацию",
    "chain.direct": "DIRECT",
    "chain.unexpected": "UNEXPECTED",
    "chain.empty": "Цепочка появится, когда ты отсканируешь предмет.",
    "chain.result": "Ты прошёл путь из {n} шагов: от «{from}» до «{to}»!",
    "chain.toquiz": "Проверь себя в квизе →",
    "chain.legend": "Цвет карточки = школьный предмет. Значок = факт или аналогия.",

    /* Collection */
    "collection.title": "Моя коллекция",
    "collection.discoveries": "Открытия",
    "collection.topics": "Изученные темы",
    "collection.empty": "Пока пусто. Отсканируй предмет и сохрани первую связь!",
    "collection.topics.empty": "Пока нет изученных тем. Выбери тему на главной в режиме «Учу тему».",
    "collection.open": "Открыть",
    "collection.delete": "Удалить",
    "collection.all": "Все",
    "collection.count": "Связей найдено: {n} · Тем изучено: {m}",

    /* Quiz */
    "quiz.title": "Квиз",
    "quiz.subtitle": "Вопросы по твоим открытиям и изученным темам",
    "quiz.start": "Начать квиз",
    "quiz.empty": "Сохрани хотя бы одно открытие или изучи тему — и квиз соберётся из твоих находок.",
    "quiz.demo": "Пройти демо-квиз",
    "quiz.q": "Вопрос {n} из {total}",
    "quiz.next": "Дальше →",
    "quiz.finish": "Результат",
    "quiz.right": "Верно! 🎉",
    "quiz.wrong": "Не совсем.",
    "quiz.result": "Ты ответил правильно на {n} из {total}",
    "quiz.great": "Отлично! Ты настоящий исследователь 🏆",
    "quiz.good": "Хороший результат! Ещё немного — и будет идеально 💪",
    "quiz.try": "Ничего страшного — перечитай свои открытия и попробуй снова 🌱",
    "quiz.again": "Пройти ещё раз",

    /* Settings */
    "settings.title": "Настройки",
    "settings.lang": "Язык интерфейса",
    "settings.mode": "Как работает «AI»",
    "settings.mode.demo": "Демо (без интернета и ключей): готовые данные для 8 предметов",
    "settings.mode.ai": "AI (Claude): фото распознаёт Claude по твоему API-ключу",
    "settings.key": "API-ключ Claude",
    "settings.key.hint": "Ключ хранится только в этом браузере (localStorage) и отправляется напрямую в api.anthropic.com. Не используй ключ на чужом компьютере. Каждый запрос тратит средства с твоего аккаунта Anthropic.",
    "settings.model": "Модель",
    "settings.save": "Сохранить",
    "settings.saved": "Сохранено ✓",
    "settings.clear": "Очистить коллекцию и прогресс",
    "settings.clear.confirm": "Точно удалить все открытия и изученные темы?",
    "settings.about": "О проекте",
    "settings.about.text": "HomeTry — прототип образовательного стартапа. Факты отмечены значком 📚 и имеют источник, аналогии — значком 💡. Если нашёл ошибку — напиши команде!",

    /* Errors */
    "error.data": "Не удалось загрузить данные.",
    "error.ai.nokey": "Вставь API-ключ Claude в настройках.",
    "error.ai.fail": "AI не ответил: {msg}. Выбери предмет вручную ниже.",
    "error.ai.refusal": "Claude отказался обработать это фото. Попробуй другое или выбери предмет вручную.",
    "error.ai.notfound": "Claude не смог узнать предмет на фото. Выбери вручную ниже.",

    "common.back": "← Назад",
    "common.home": "На главную"
  },

  /* Казахский — заготовка. Переведены основные кнопки, остальное берётся из ru.
     Перевод нужно проверить носителю языка! */
  kk: {
    "app.slogan": "Бүкіл әлем — сенің оқулығың",
    "nav.home": "Басты бет",
    "nav.scan": "Сканер",
    "nav.chain": "Тізбек",
    "nav.collection": "Жинақ",
    "nav.quiz": "Квиз",
    "nav.settings": "Баптаулар",
    "home.choose": "Қай пәнді оқимыз?",
    "subject.history": "Тарих",
    "subject.physics": "Физика",
    "subject.chemistry": "Химия",
    "subject.biology": "Биология",
    "subject.geography": "География",
    "subject.math": "Математика",
    "subject.literature": "Әдебиет",
    "badge.fact": "📚 Дерек",
    "badge.analogy": "💡 Ұқсастық",
    "settings.title": "Баптаулар",
    "settings.lang": "Интерфейс тілі",
    "settings.save": "Сақтау",
    "common.back": "← Артқа"
  }
};

const LANGS = { ru: "Русский", kk: "Қазақша (черновик)" };

let currentLang = "ru";

/** Перевод по ключу. vars — подстановки вида {name}. */
function t(key, vars) {
  let s = (I18N[currentLang] && I18N[currentLang][key]) ?? I18N.ru[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Применяет переводы ко всем элементам с атрибутом data-i18n. */
function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.documentElement.lang = currentLang;
}

function setLang(lang) {
  currentLang = I18N[lang] ? lang : "ru";
  applyStaticTranslations();
}
