/* =========================================================================
   HomeTry — логика приложения (одностраничный сайт без сборки)
   -------------------------------------------------------------------------
   Разделы (адрес после #):
     #/home              — выбор школьного предмета
     #/subject/<id>      — «Исследовать вещь» или «Учу тему» (список тем)
     #/learn/<topicId>   — режим «Учу тему»: карточка → найди дома → проверка
     #/scan              — фото / камера / демо-предметы
     #/discover          — результат: связь, вопрос, мини-задание, 3 режима
     #/chain             — Connection Chain (анимированная цепочка)
     #/collection        — My Discoveries (localStorage)
     #/quiz              — квиз по найденным связям и изученным темам
     #/settings          — язык, демо/AI, API-ключ
   ========================================================================= */

"use strict";

/* ---------- Школьные предметы (названия — в i18n.js) ---------- */
const SUBJECTS = [
  { id: "history",    icon: "🏛️", color: "#f2994a" },
  { id: "physics",    icon: "⚡",  color: "#2d9cdb" },
  { id: "chemistry",  icon: "🧪", color: "#9b51e0" },
  { id: "biology",    icon: "🧬", color: "#27ae60" },
  { id: "geography",  icon: "🌍", color: "#00b8a9" },
  { id: "math",       icon: "📐", color: "#eb5757" },
  { id: "literature", icon: "📖", color: "#e056a0" }
];
const SUBJECT_IDS = SUBJECTS.map(s => s.id);
const subjectById = id => SUBJECTS.find(s => s.id === id);
const subjectName = id => t("subject." + id);

const MODES = ["direct", "unexpected", "challenge"];

/* ---------- Хранилище (localStorage с защитой от ошибок) ---------- */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("hometry." + key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("hometry." + key, JSON.stringify(value)); return true; }
    catch { toast("Не удалось сохранить (память браузера заполнена или запрещена)"); return false; }
  }
};

/* ---------- Состояние ---------- */
const state = {
  data: { objects: [], topics: [] },
  subject: store.get("subject", null),
  current: store.get("current", null), // { entry, subject, mode, thumb }
  photo: null,                          // полное фото (только в памяти)
  settings: Object.assign({ lang: "ru", mode: "demo", apiKey: "", model: AI_DEFAULT_MODEL }, store.get("settings", {})),
  chainMode: "direct",
  learn: null,                          // состояние текущей темы
  quiz: null
};
const discoveries = () => store.get("discoveries", []);
const topicsDone = () => store.get("topicsDone", []);

/* ---------- Утилиты ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const findObject = id => state.data.objects.find(o => o.id === id);
const findTopic = id => state.data.topics.find(x => x.id === id);

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function confetti() {
  const box = document.createElement("div");
  box.className = "confetti";
  const items = ["🎉", "⭐", "✨", "🏆", "💡", "📚"];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.textContent = items[i % items.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    s.style.fontSize = 16 + Math.random() * 20 + "px";
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

function badgeHtml(badge) {
  return `<span class="badge badge-${badge === "fact" ? "fact" : "analogy"}">${t("badge." + (badge === "fact" ? "fact" : "analogy"))}</span>`;
}

function sourceHtml(source, badge) {
  if (source && source.url) {
    return `<p class="source">${t("discover.source")} <a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.title)} ↗</a></p>`;
  }
  return badge === "analogy" ? `<p class="source muted">${t("discover.nosource")}</p>` : "";
}

function subjectChip(id) {
  const s = subjectById(id);
  if (!s) return "";
  return `<span class="chip" style="--c:${s.color}">${s.icon} ${esc(subjectName(id))}</span>`;
}

/* Маленькая копия фото для коллекции (чтобы не переполнить localStorage) */
function makeThumb(dataUrl, side = 160) {
  return new Promise(resolve => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const k = side / Math.max(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* ---------- Загрузка данных ---------- */
async function loadData() {
  try {
    if (location.protocol === "file:") throw new Error("file://"); // fetch тут запрещён — сразу берём копию
    const [o, tp] = await Promise.all([
      fetch("data/objects.json").then(r => { if (!r.ok) throw 0; return r.json(); }),
      fetch("data/topics.json").then(r => { if (!r.ok) throw 0; return r.json(); })
    ]);
    state.data = { objects: o.objects, topics: tp.topics };
  } catch {
    // Открыто как file:// — fetch запрещён. Берём копию данных из data-fallback.js
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "data/data-fallback.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    const fb = window.HOMETRY_FALLBACK;
    state.data = { objects: fb.objects.objects, topics: fb.topics.topics };
  }
}

/* ---------- Роутер ---------- */
const routes = {
  home: renderHome,
  subject: renderSubject,
  learn: renderLearn,
  scan: renderScan,
  discover: renderDiscover,
  chain: renderChain,
  collection: renderCollection,
  quiz: renderQuiz,
  settings: renderSettings
};

function go(path) {
  if (location.hash === "#/" + path) render(); else location.hash = "#/" + path;
}

function render() {
  const [name, param] = location.hash.replace(/^#\/?/, "").split("/");
  const route = routes[name] ? name : "home";
  document.querySelectorAll(".bottomnav a").forEach(a => {
    const r = a.dataset.route;
    a.classList.toggle("active", r === route || (r === "home" && (route === "subject" || route === "learn")) || (r === "scan" && route === "discover"));
  });
  const pill = $("#modePill");
  pill.textContent = state.settings.mode === "ai" ? "✨ " + t("mode.ai") : "🧩 " + t("mode.demo");
  pill.classList.toggle("ai", state.settings.mode === "ai");
  const view = $("#view");
  view.innerHTML = "";
  view.className = "view view-" + route;
  routes[route](view, param ? decodeURIComponent(param) : undefined);
  window.scrollTo(0, 0);
}

/* =========================================================================
   HOME
   ========================================================================= */
function renderHome(view) {
  view.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">${t("app.tagline")}</p>
        <h1>${t("home.hero.title")}</h1>
        <p>${t("home.hero.text")}</p>
        <ol class="steps">
          <li><span>1</span>${t("home.step1")}</li>
          <li><span>2</span>${t("home.step2")}</li>
          <li><span>3</span>${t("home.step3")}</li>
        </ol>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="orbit">
          <span style="--i:0">🧦</span><span style="--i:1">🥄</span><span style="--i:2">🪙</span><span style="--i:3">👟</span>
          <span style="--i:4">🍎</span><span style="--i:5">✏️</span><span style="--i:6">💧</span><span style="--i:7">📱</span>
          <b>🔍</b>
        </div>
      </div>
    </section>

    <section class="demo-card">
      <div>
        <h3>🏁 ${t("home.demo.title")}</h3>
        <p>${t("home.demo.text")}</p>
      </div>
      <button class="btn btn-light" id="demoBtn">${t("home.demo.btn")}</button>
    </section>

    <h2 class="section-title">${t("home.choose")}</h2>
    <div class="subject-grid">
      ${SUBJECTS.map(s => `
        <a class="subject-card ${state.subject === s.id ? "selected" : ""}" href="#/subject/${s.id}" style="--c:${s.color}" data-subject="${s.id}">
          <span class="subject-icon">${s.icon}</span>
          <b>${t("subject." + s.id)}</b>
          <small>${t("subject." + s.id + ".sub")}</small>
        </a>`).join("")}
    </div>`;
  $("#demoBtn", view).onclick = () => {
    setSubject("history");
    openDiscovery(findObject("coin"), "history", null, "direct");
  };
}

function setSubject(id) {
  state.subject = id;
  store.set("subject", id);
}

/* =========================================================================
   SUBJECT — выбор: исследовать вещь или «Учу тему»
   ========================================================================= */
function renderSubject(view, id) {
  if (!subjectById(id)) return go("home");
  setSubject(id);
  const s = subjectById(id);
  const done = topicsDone();
  const topics = state.data.topics.filter(x => x.subject === id);
  view.innerHTML = `
    <a class="back" href="#/home">${t("subject.change")}</a>
    <header class="page-head" style="--c:${s.color}">
      <span class="big-icon">${s.icon}</span>
      <div><h1>${t("subject." + id)}</h1><p>${t("subject." + id + ".sub")}</p></div>
    </header>
    <h2 class="section-title">${t("subject.how")}</h2>
    <div class="two-cols">
      <section class="card explore-card" style="--c:${s.color}">
        <h3>${t("subject.explore.title")}</h3>
        <p>${t("subject.explore.text", { subject: t("subject." + id) })}</p>
        <a class="btn btn-primary" href="#/scan">${t("subject.explore.btn")}</a>
      </section>
      <section class="card learn-card">
        <h3>${t("subject.learn.title")}</h3>
        <p>${t("subject.learn.text")}</p>
        <div class="topic-list">
          ${topics.map(tp => `
            <a class="topic-item ${done.some(d => d.topicId === tp.id) ? "done" : ""}" href="#/learn/${tp.id}" data-topic="${tp.id}">
              <span>${esc(tp.title)}</span>
              ${done.some(d => d.topicId === tp.id) ? `<em>${t("subject.topic.done")}</em>` : "<i>→</i>"}
            </a>`).join("")}
        </div>
      </section>
    </div>`;
}

/* =========================================================================
   LEARN — режим «Учу тему»
   ========================================================================= */
function renderLearn(view, topicId) {
  const tp = findTopic(topicId);
  if (!tp) return go("home");
  setSubject(tp.subject);
  if (!state.learn || state.learn.id !== tp.id) {
    state.learn = { id: tp.id, step: 0, found: [], answers: [null, null, null], quizOrder: tp.quiz.map(q => shuffle(q.options.map((o, i) => i))) };
  }
  const L = state.learn;
  const s = subjectById(tp.subject);
  const stepNames = [t("learn.step.card"), t("learn.step.home"), t("learn.step.check")];

  let body = "";
  if (L.step === 0) {
    body = `
      <section class="card topic-card" style="--c:${s.color}">
        <div class="card-top">${badgeHtml(tp.badge)}${subjectChip(tp.subject)}</div>
        <h3>${t("learn.rule")}</h3>
        <p class="rule">${esc(tp.rule)}</p>
        <div class="key-box">
          <small>${esc(tp.key.label)}</small>
          <div class="key-text">${esc(tp.key.text)}</div>
          ${tp.key.note ? `<p>${esc(tp.key.note)}</p>` : ""}
        </div>
        ${sourceHtml(tp.source, tp.badge)}
      </section>
      <button class="btn btn-primary btn-wide" data-step="1">${t("learn.next.home")}</button>`;
  } else if (L.step === 1) {
    body = `
      <section class="card">
        <h3>${t("learn.home.title")}</h3>
        <p class="muted">${t("learn.home.text")}</p>
        <div class="home-items">
          ${tp.findAtHome.map((h, i) => `
            <div class="home-item ${L.found.includes(i) ? "found" : ""}">
              <span class="home-emoji">${esc(h.emoji)}</span>
              <div>
                <b>${esc(h.name)}</b>
                <p>${esc(h.how)}</p>
                <div class="home-actions">
                  <button class="btn btn-small ${L.found.includes(i) ? "btn-done" : ""}" data-found="${i}">${L.found.includes(i) ? "✓ " : ""}${t("learn.home.found")}</button>
                  ${h.objectId && findObject(h.objectId) ? `<button class="btn btn-small btn-ghost" data-explore="${h.objectId}">${t("learn.home.explore")}</button>` : ""}
                </div>
              </div>
            </div>`).join("")}
        </div>
      </section>
      <section class="card exp-card">
        <h3>${t("learn.exp.title")}: ${esc(tp.experiment.title)}</h3>
        <ol class="exp-steps">${tp.experiment.steps.map(st => `<li>${esc(st)}</li>`).join("")}</ol>
        <details class="reveal">
          <summary>${t("learn.exp.show")}</summary>
          <p><b>${t("learn.exp.observe")}:</b> ${esc(tp.experiment.observe)}</p>
        </details>
      </section>
      <button class="btn btn-primary btn-wide" data-step="2">${t("learn.next.check")}</button>`;
  } else {
    const answered = L.answers.filter(a => a !== null).length;
    const correct = L.answers.filter((a, i) => a === tp.quiz[i].answer).length;
    const already = topicsDone().some(d => d.topicId === tp.id);
    body = `
      <section class="card">
        <h3>${t("learn.check.title")}</h3>
        ${tp.quiz.map((q, qi) => `
          <div class="mini-q">
            <p class="q-text">${qi + 1}. ${esc(q.q)}</p>
            <div class="options">
              ${L.quizOrder[qi].map(oi => {
                const a = L.answers[qi];
                let cls = "";
                if (a !== null) cls = oi === q.answer ? "right" : (oi === a ? "wrong" : "dim");
                return `<button class="option ${cls}" data-q="${qi}" data-o="${oi}" ${a !== null ? "disabled" : ""}>${esc(q.options[oi])}</button>`;
              }).join("")}
            </div>
            ${L.answers[qi] !== null ? `<p class="explain">${L.answers[qi] === q.answer ? t("quiz.right") : t("quiz.wrong")} ${esc(q.explain)}</p>` : ""}
          </div>`).join("")}
        ${answered === 3 ? `<p class="score-line">${t("learn.score", { n: correct, total: 3 })}</p>` : ""}
      </section>
      ${already ? `<p class="muted center">${t("learn.done.already")}</p>` : ""}
      <button class="btn btn-primary btn-wide" id="doneBtn" ${answered < 3 ? "disabled" : ""}>${t("learn.done.btn")}</button>
      ${answered < 3 ? `<p class="muted center">${t("learn.done.need")}</p>` : ""}`;
  }

  view.innerHTML = `
    <a class="back" href="#/subject/${tp.subject}">${t("learn.back")}</a>
    <header class="page-head" style="--c:${s.color}">
      <span class="big-icon">${s.icon}</span>
      <div><small>${t("subject.learn.title")} · ${t("subject." + tp.subject)}</small><h1>${esc(tp.title)}</h1></div>
    </header>
    <div class="stepper">
      ${stepNames.map((n, i) => `<button class="${i === L.step ? "active" : ""} ${i < L.step ? "passed" : ""}" data-step="${i}"><span>${i + 1}</span>${n}</button>`).join("")}
    </div>
    ${body}`;

  view.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { L.step = +b.dataset.step; renderLearn(view, topicId); window.scrollTo(0, 0); });
  view.querySelectorAll("[data-found]").forEach(b => b.onclick = () => {
    const i = +b.dataset.found;
    L.found = L.found.includes(i) ? L.found.filter(x => x !== i) : [...L.found, i];
    renderLearn(view, topicId);
  });
  view.querySelectorAll("[data-explore]").forEach(b => b.onclick = () => openDiscovery(findObject(b.dataset.explore), tp.subject, null, "direct"));
  view.querySelectorAll(".option[data-q]").forEach(b => b.onclick = () => {
    L.answers[+b.dataset.q] = +b.dataset.o;
    renderLearn(view, topicId);
  });
  const doneBtn = $("#doneBtn", view);
  if (doneBtn) doneBtn.onclick = () => {
    const correct = L.answers.filter((a, i) => a === tp.quiz[i].answer).length;
    const list = topicsDone().filter(d => d.topicId !== tp.id);
    list.unshift({ topicId: tp.id, subject: tp.subject, title: tp.title, score: correct, total: 3, found: L.found.length, date: new Date().toISOString() });
    if (store.set("topicsDone", list)) {
      toast(t("learn.done.saved"));
      confetti();
      state.learn = null;
      setTimeout(() => go("collection"), 900);
    }
  };
}

/* =========================================================================
   SCAN
   ========================================================================= */
function renderScan(view) {
  const subj = state.subject;
  const isAi = state.settings.mode === "ai";
  view.innerHTML = `
    <h1>${t("scan.title")}</h1>
    <div class="scan-subject">
      <span>${t("scan.subject")}</span>
      <div class="mini-subjects">
        ${SUBJECTS.map(s => `<button class="mini-subject ${s.id === subj ? "active" : ""}" style="--c:${s.color}" data-subj="${s.id}" title="${esc(subjectName(s.id))}">${s.icon}<span>${esc(subjectName(s.id))}</span></button>`).join("")}
      </div>
    </div>
    ${subj ? "" : `<p class="warn">${t("scan.nosubject")}</p>`}

    <label class="upload ${state.photo ? "has-photo" : ""}">
      <input type="file" accept="image/*" capture="environment" id="photoInput" hidden>
      ${state.photo
        ? `<img src="${state.photo}" alt="Твоё фото">`
        : `<span class="upload-icon">📷</span><b>${t("scan.upload")}</b><small>${t("scan.upload.hint")}</small><span class="scan-line"></span>`}
    </label>

    ${state.photo ? `
      <section class="card">
        ${isAi ? `<button class="btn btn-ai btn-wide" id="aiBtn">${t("scan.ai.btn")}</button><div id="aiStatus"></div>` : `<p class="muted">${t("scan.ai.off")}</p>`}
        <h3>${t("scan.what")}</h3>
        <p class="muted">${t("scan.what.hint")}</p>
        <div class="object-grid">
          ${state.data.objects.map(o => `<button class="object-btn" data-obj="${o.id}"><span>${o.emoji}</span>${esc(o.name)}</button>`).join("")}
        </div>
      </section>` : ""}

    <h3 class="section-title">${t("scan.quick")}</h3>
    <div class="object-grid quick">
      ${state.data.objects.map(o => `<button class="object-btn" data-obj="${o.id}" data-quick="1"><span>${o.emoji}</span>${esc(o.name)}</button>`).join("")}
    </div>`;

  view.querySelectorAll("[data-subj]").forEach(b => b.onclick = () => { setSubject(b.dataset.subj); renderScan(view); });
  $("#photoInput", view).onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { state.photo = reader.result; renderScan(view); };
    reader.readAsDataURL(file);
  };
  view.querySelectorAll("[data-obj]").forEach(b => b.onclick = () => {
    if (!state.subject) return toast(t("scan.nosubject"));
    if (b.dataset.quick) state.photo = null;
    openDiscovery(findObject(b.dataset.obj), state.subject, state.photo, "direct");
  });
  const aiBtn = $("#aiBtn", view);
  if (aiBtn) aiBtn.onclick = async () => {
    if (!state.subject) return toast(t("scan.nosubject"));
    const status = $("#aiStatus", view);
    aiBtn.disabled = true;
    status.innerHTML = `<div class="loader"><span></span>${t("scan.ai.loading")}</div>`;
    try {
      const entry = await analyzePhotoWithClaude(state.photo, state.subject, subjectName(state.subject), state.settings);
      openDiscovery(entry, state.subject, state.photo, "direct");
    } catch (err) {
      status.innerHTML = `<p class="warn">${esc(t("error.ai.fail", { msg: err.message }))}</p>`;
      aiBtn.disabled = false;
    }
  };
}

/** Открывает результат для вещи (демо-запись или ответ AI). */
async function openDiscovery(entry, subject, photo, mode) {
  if (!entry || !entry.topics[subject]) return toast(t("error.data"));
  const thumb = await makeThumb(photo);
  state.current = { entry, subject, mode: mode || "direct", thumb };
  store.set("current", state.current);
  state.chainMode = "direct";
  go("discover");
}

/* =========================================================================
   DISCOVER
   ========================================================================= */
function renderDiscover(view) {
  const cur = state.current;
  if (!cur) {
    view.innerHTML = `<div class="empty"><p>${t("discover.empty")}</p><a class="btn btn-primary" href="#/scan">${t("nav.scan")}</a></div>`;
    return;
  }
  const { entry, subject, mode } = cur;
  const topic = entry.topics[subject];
  const s = subjectById(subject);
  const saved = isSaved(entry, subject, mode);

  let content;
  if (mode === "challenge") {
    const c = topic.challenge;
    content = `
      <section class="card result-card" style="--c:${s.color}">
        <div class="card-top">${badgeHtml(c.badge)}<span class="mode-tag">CHALLENGE</span></div>
        <h3 class="challenge-q">${esc(c.question)}</h3>
        <details class="reveal hint"><summary>💡 ${t("discover.challenge.hint")}</summary><p>${esc(c.hint)}</p></details>
        <label class="field-label" for="answer">${t("discover.challenge.your")}</label>
        <textarea id="answer" rows="5" placeholder="${t("discover.challenge.placeholder")}">${esc(cur.answer || "")}</textarea>
        <button class="btn btn-primary" id="checkBtn">${t("discover.challenge.check")}</button>
        <div id="sampleBox" ${cur.checked ? "" : "hidden"}>
          <div class="sample">
            <b>✅ ${t("discover.challenge.sample")}</b>
            <p>${esc(c.sample)}</p>
            ${sourceHtml(c.source, c.badge)}
          </div>
          <p class="muted" id="overlap"></p>
        </div>
      </section>`;
  } else {
    const r = topic[mode];
    content = `
      <section class="card result-card" style="--c:${s.color}">
        <div class="card-top">${badgeHtml(r.badge)}<span class="mode-tag">${mode.toUpperCase()}</span></div>
        <h3>${esc(r.title)}</h3>
        <p class="result-text">${esc(r.text)}</p>
        ${sourceHtml(r.source, r.badge)}
        <div class="qa">
          <div class="qa-box q"><b>${t("discover.question")}</b><p>${esc(r.question)}</p></div>
          <div class="qa-box task"><b>${t("discover.task")}</b><p>${esc(r.task)}</p></div>
        </div>
        <div class="mini-chain" aria-hidden="true">
          ${r.chain.map(st => `<span style="--c:${subjectById(st.subject)?.color || "#999"}">${esc(st.label)}</span>`).join("<i>→</i>")}
        </div>
      </section>`;
  }

  view.innerHTML = `
    <section class="found">
      ${cur.thumb ? `<img class="found-photo" src="${cur.thumb}" alt="">` : `<span class="found-emoji">${esc(entry.emoji)}</span>`}
      <div>
        <small>${t("discover.found")}</small>
        <h1>${cur.thumb ? esc(entry.emoji) + " " : ""}${esc(entry.name)}</h1>
        <p>${t("discover.in")} ${subjectChip(subject)}</p>
        ${entry.ai ? `<p class="ai-note">✨ ${t("discover.ai")}</p>` : ""}
      </div>
    </section>

    <div class="mode-tabs" role="tablist" aria-label="${t("discover.modes")}">
      ${MODES.map(m => `
        <button role="tab" class="mode-tab ${m === mode ? "active" : ""}" data-mode="${m}" aria-selected="${m === mode}">
          <b>${t("discover.mode." + m)}</b><small>${t("discover.mode." + m + ".sub")}</small>
        </button>`).join("")}
    </div>

    ${content}

    <div class="actions">
      <button class="btn btn-chain" id="chainBtn">${t("discover.chain")}</button>
      <button class="btn ${saved ? "btn-done" : "btn-secondary"}" id="saveBtn">${saved ? t("discover.saved") : t("discover.save")}</button>
    </div>`;

  view.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
    cur.mode = b.dataset.mode;
    store.set("current", cur);
    renderDiscover(view);
  });
  $("#chainBtn", view).onclick = () => { state.chainMode = mode === "unexpected" ? "unexpected" : "direct"; go("chain"); };
  $("#saveBtn", view).onclick = () => { saveDiscovery(); renderDiscover(view); };

  const checkBtn = $("#checkBtn", view);
  if (checkBtn) {
    const showOverlap = () => {
      const words = txt => new Set(txt.toLowerCase().match(/[a-zа-яёәғқңөұүһі]{5,}/gi) || []);
      const mine = words(cur.answer || "");
      const common = [...words(topic.challenge.sample)].filter(w => [...mine].some(m => m.slice(0, 5) === w.slice(0, 5)));
      $("#overlap", view).textContent = t("discover.challenge.feedback") + (common.length ? ` Общие идеи: ${common.slice(0, 6).join(", ")}.` : "");
    };
    if (cur.checked) showOverlap();
    checkBtn.onclick = () => {
      const text = $("#answer", view).value.trim();
      if (text.length < 15) return toast(t("discover.challenge.short"));
      cur.answer = text;
      cur.checked = true;
      store.set("current", cur);
      $("#sampleBox", view).hidden = false;
      showOverlap();
      $("#sampleBox", view).scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
  }
}

function discoveryKey(entry, subject, mode) { return `${entry.ai ? entry.id : entry.id}|${subject}|${mode}`; }
function isSaved(entry, subject, mode) { return discoveries().some(d => d.key === discoveryKey(entry, subject, mode)); }

function saveDiscovery() {
  const cur = state.current;
  const { entry, subject, mode } = cur;
  const key = discoveryKey(entry, subject, mode);
  let list = discoveries();
  if (list.some(d => d.key === key)) { list = list.filter(d => d.key !== key); store.set("discoveries", list); return; }
  const topic = entry.topics[subject];
  const title = mode === "challenge" ? topic.challenge.question : topic[mode].title;
  const badge = mode === "challenge" ? topic.challenge.badge : topic[mode].badge;
  list.unshift({
    key, objectId: entry.id, name: entry.name, emoji: entry.emoji, subject, mode, title, badge,
    answer: mode === "challenge" ? cur.answer || "" : undefined,
    thumb: cur.thumb || null,
    entry: entry.ai ? entry : undefined,   // AI-ответы храним целиком, демо — по id
    date: new Date().toISOString()
  });
  if (store.set("discoveries", list)) toast("⭐ " + t("discover.saved"));
}

/* =========================================================================
   CONNECTION CHAIN
   ========================================================================= */
function renderChain(view) {
  const cur = state.current;
  if (!cur) {
    view.innerHTML = `<div class="empty"><p>${t("chain.empty")}</p><a class="btn btn-primary" href="#/scan">${t("nav.scan")}</a></div>`;
    return;
  }
  const topic = cur.entry.topics[cur.subject];
  const mode = state.chainMode;
  const r = topic[mode];
  const steps = r.chain;

  view.innerHTML = `
    <header class="chain-head">
      <p class="eyebrow">${esc(cur.entry.emoji)} ${esc(cur.entry.name)} · ${esc(subjectName(cur.subject))}</p>
      <h1>${t("chain.title")}</h1>
      <p>${t("chain.subtitle")}</p>
      <div class="chain-toggle">
        ${["direct", "unexpected"].map(m => `<button class="${m === mode ? "active" : ""}" data-cm="${m}">${t("chain." + m)}</button>`).join("")}
      </div>
      <h2 class="chain-title">${badgeHtml(r.badge)} ${esc(r.title)}</h2>
    </header>

    <div class="chain" id="chain">
      ${steps.map((st, i) => {
        const s = subjectById(st.subject) || { color: "#888", icon: "•" };
        return `
          ${i > 0 ? `<div class="chain-link" style="--d:${i}"><span class="pulse"></span><span class="arrow">➜</span></div>` : ""}
          <article class="chain-card ${i === 0 ? "first" : ""} ${i === steps.length - 1 ? "last" : ""}" style="--c:${s.color}; --d:${i}">
            <div class="chain-num">${i + 1}</div>
            <div class="chain-subject">${s.icon} ${esc(subjectName(st.subject))}</div>
            <h3>${i === 0 ? esc(cur.entry.emoji) + " " : ""}${esc(st.label)}</h3>
            <p>${esc(st.text)}</p>
            ${badgeHtml(st.badge)}
          </article>`;
      }).join("")}
    </div>

    <div class="chain-result" id="chainResult">
      <p>🎯 ${t("chain.result", { n: steps.length, from: esc(steps[0].label), to: esc(steps[steps.length - 1].label) })}</p>
      ${sourceHtml(r.source, r.badge)}
      <div class="actions">
        <button class="btn btn-secondary" id="replayBtn">${t("chain.replay")}</button>
        <a class="btn btn-primary" href="#/quiz">${t("chain.toquiz")}</a>
      </div>
      <p class="muted small">${t("chain.legend")}</p>
    </div>`;

  view.querySelectorAll("[data-cm]").forEach(b => b.onclick = () => { state.chainMode = b.dataset.cm; renderChain(view); });
  $("#replayBtn", view).onclick = () => animateChain(view);
  animateChain(view);
}

/** Показывает карточки и связи по очереди: карточка → линия → карточка… */
function animateChain(view) {
  const chain = $("#chain", view);
  const parts = [...chain.children];
  const result = $("#chainResult", view);
  parts.forEach(p => p.classList.remove("show"));
  result.classList.remove("show");
  clearTimeout(animateChain._t);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = reduce ? 0 : 420;
  parts.forEach((p, i) => setTimeout(() => {
    p.classList.add("show");
    if (window.innerWidth < 960 && !reduce && i > 1) p.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, i * delay));
  animateChain._t = setTimeout(() => result.classList.add("show"), parts.length * delay + 200);
}

/* =========================================================================
   MY DISCOVERIES (коллекция)
   ========================================================================= */
function renderCollection(view, tab) {
  tab = tab === "topics" ? "topics" : "discoveries";
  const list = discoveries();
  const done = topicsDone();
  const filter = state.collectionFilter || "all";

  const discHtml = () => {
    const items = list.filter(d => filter === "all" || d.subject === filter);
    if (!list.length) return `<div class="empty"><p>${t("collection.empty")}</p><a class="btn btn-primary" href="#/scan">${t("nav.scan")}</a></div>`;
    return `
      <div class="filter-row">
        <button class="${filter === "all" ? "active" : ""}" data-filter="all">${t("collection.all")}</button>
        ${SUBJECTS.filter(s => list.some(d => d.subject === s.id)).map(s => `<button class="${filter === s.id ? "active" : ""}" data-filter="${s.id}">${s.icon} ${esc(subjectName(s.id))}</button>`).join("")}
      </div>
      <div class="collection-grid">
        ${items.map(d => {
          const s = subjectById(d.subject);
          return `
          <article class="disc-card" style="--c:${s.color}">
            <div class="disc-top">
              ${d.thumb ? `<img src="${d.thumb}" alt="">` : `<span class="disc-emoji">${esc(d.emoji)}</span>`}
              <div><b>${esc(d.name)}</b>${subjectChip(d.subject)}</div>
            </div>
            <div class="card-top">${badgeHtml(d.badge)}<span class="mode-tag">${d.mode.toUpperCase()}</span></div>
            <p class="disc-title">${esc(d.title)}</p>
            ${d.answer ? `<p class="disc-answer">✍️ ${esc(d.answer)}</p>` : ""}
            <small class="muted">${new Date(d.date).toLocaleDateString("ru-RU")}</small>
            <div class="disc-actions">
              <button class="btn btn-small" data-open="${esc(d.key)}">${t("collection.open")}</button>
              <button class="btn btn-small btn-ghost" data-del="${esc(d.key)}">${t("collection.delete")}</button>
            </div>
          </article>`;
        }).join("")}
      </div>`;
  };

  const topicsHtml = () => {
    if (!done.length) return `<div class="empty"><p>${t("collection.topics.empty")}</p><a class="btn btn-primary" href="#/home">${t("common.home")}</a></div>`;
    return `<div class="collection-grid">
      ${done.map(d => {
        const s = subjectById(d.subject);
        return `
        <article class="disc-card topic-done" style="--c:${s.color}">
          <div class="disc-top"><span class="disc-emoji">🎓</span><div><b>${esc(d.title)}</b>${subjectChip(d.subject)}</div></div>
          <p>${t("learn.score", { n: d.score, total: d.total })}</p>
          <small class="muted">${new Date(d.date).toLocaleDateString("ru-RU")}</small>
          <div class="disc-actions">
            <a class="btn btn-small" href="#/learn/${d.topicId}">${t("collection.open")}</a>
            <button class="btn btn-small btn-ghost" data-deltopic="${d.topicId}">${t("collection.delete")}</button>
          </div>
        </article>`;
      }).join("")}
    </div>`;
  };

  view.innerHTML = `
    <h1>⭐ ${t("collection.title")}</h1>
    <p class="muted">${t("collection.count", { n: list.length, m: done.length })}</p>
    <div class="tabs">
      <a class="${tab === "discoveries" ? "active" : ""}" href="#/collection/discoveries">🔍 ${t("collection.discoveries")} <span>${list.length}</span></a>
      <a class="${tab === "topics" ? "active" : ""}" href="#/collection/topics">🎓 ${t("collection.topics")} <span>${done.length}</span></a>
    </div>
    ${tab === "topics" ? topicsHtml() : discHtml()}`;

  view.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => { state.collectionFilter = b.dataset.filter; renderCollection(view, tab); });
  view.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { store.set("discoveries", discoveries().filter(d => d.key !== b.dataset.del)); renderCollection(view, tab); });
  view.querySelectorAll("[data-deltopic]").forEach(b => b.onclick = () => { store.set("topicsDone", topicsDone().filter(d => d.topicId !== b.dataset.deltopic)); renderCollection(view, tab); });
  view.querySelectorAll("[data-open]").forEach(b => b.onclick = () => {
    const d = discoveries().find(x => x.key === b.dataset.open);
    const entry = d.entry || findObject(d.objectId);
    if (!entry) return toast(t("error.data"));
    state.current = { entry, subject: d.subject, mode: d.mode, thumb: d.thumb, answer: d.answer, checked: !!d.answer };
    store.set("current", state.current);
    go("discover");
  });
}

/* =========================================================================
   QUIZ
   ========================================================================= */
function buildQuizPool() {
  const pool = [];
  const add = (q, from) => { if (q && !pool.some(p => p.q === q.q)) pool.push({ ...q, from }); };
  for (const d of discoveries()) {
    const entry = d.entry || findObject(d.objectId);
    (entry?.topics[d.subject]?.quiz || []).forEach(q => add(q, `${d.emoji} ${d.name} · ${subjectName(d.subject)}`));
  }
  for (const d of topicsDone()) {
    (findTopic(d.topicId)?.quiz || []).forEach(q => add(q, `🎓 ${d.title}`));
  }
  return pool;
}

/** Если своих вопросов мало — добираем из текущей вещи и её других предметов. */
function padPool(pool) {
  const cur = state.current;
  const entry = cur?.entry || findObject("coin");
  const subject = cur?.subject || "history";
  const candidates = [];
  (entry.topics[subject]?.quiz || []).forEach(q => candidates.push({ ...q, from: `${entry.emoji} ${entry.name} · ${subjectName(subject)}` }));
  if (!entry.ai) Object.entries(entry.topics).forEach(([sid, tp]) => tp.quiz.forEach(q => candidates.push({ ...q, from: `${entry.emoji} ${entry.name} · ${subjectName(sid)}` })));
  for (const q of candidates) {
    if (pool.length >= 3) break;
    if (!pool.some(p => p.q === q.q)) pool.push(q);
  }
  return pool;
}

function renderQuiz(view) {
  const Q = state.quiz;
  if (!Q) {
    const pool = buildQuizPool();
    view.innerHTML = `
      <h1>🧠 ${t("quiz.title")}</h1>
      <p class="muted">${t("quiz.subtitle")}</p>
      <section class="card quiz-start">
        ${pool.length || state.current
          ? `<p>📚 ${discoveries().length} · 🎓 ${topicsDone().length}</p><button class="btn btn-primary btn-wide" id="startQuiz">${t("quiz.start")}</button>`
          : `<p>${t("quiz.empty")}</p><button class="btn btn-secondary btn-wide" id="startQuiz">${t("quiz.demo")}</button>`}
      </section>`;
    $("#startQuiz", view).onclick = () => {
      const questions = shuffle(padPool(buildQuizPool())).slice(0, 5);
      state.quiz = { questions, i: 0, picked: null, score: 0, orders: questions.map(q => shuffle(q.options.map((o, k) => k))) };
      renderQuiz(view);
    };
    return;
  }

  if (Q.i >= Q.questions.length) {
    const total = Q.questions.length;
    const ratio = Q.score / total;
    view.innerHTML = `
      <section class="card quiz-result">
        <div class="big-score">${Q.score}/${total}</div>
        <h2>${t("quiz.result", { n: Q.score, total })}</h2>
        <p>${ratio >= 0.8 ? t("quiz.great") : ratio >= 0.5 ? t("quiz.good") : t("quiz.try")}</p>
        <div class="actions">
          <button class="btn btn-primary" id="againBtn">${t("quiz.again")}</button>
          <a class="btn btn-secondary" href="#/collection">${t("nav.collection")}</a>
        </div>
      </section>`;
    if (ratio >= 0.8) confetti();
    $("#againBtn", view).onclick = () => { state.quiz = null; renderQuiz(view); };
    return;
  }

  const q = Q.questions[Q.i];
  const order = Q.orders[Q.i];
  view.innerHTML = `
    <div class="quiz-progress"><span style="width:${(Q.i / Q.questions.length) * 100}%"></span></div>
    <p class="muted">${t("quiz.q", { n: Q.i + 1, total: Q.questions.length })} · ${esc(q.from)}</p>
    <section class="card quiz-card">
      <h2>${esc(q.q)}</h2>
      <div class="options">
        ${order.map(k => {
          let cls = "";
          if (Q.picked !== null) cls = k === q.answer ? "right" : (k === Q.picked ? "wrong" : "dim");
          return `<button class="option ${cls}" data-k="${k}" ${Q.picked !== null ? "disabled" : ""}>${esc(q.options[k])}</button>`;
        }).join("")}
      </div>
      ${Q.picked !== null ? `
        <p class="explain">${Q.picked === q.answer ? t("quiz.right") : t("quiz.wrong")} ${esc(q.explain)}</p>
        <button class="btn btn-primary btn-wide" id="nextQ">${Q.i + 1 < Q.questions.length ? t("quiz.next") : t("quiz.finish")}</button>` : ""}
    </section>`;
  view.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    Q.picked = +b.dataset.k;
    if (Q.picked === q.answer) Q.score++;
    renderQuiz(view);
  });
  const next = $("#nextQ", view);
  if (next) next.onclick = () => { Q.i++; Q.picked = null; renderQuiz(view); };
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
function renderSettings(view) {
  const st = state.settings;
  view.innerHTML = `
    <h1>⚙️ ${t("settings.title")}</h1>
    <section class="card form">
      <label class="field-label" for="lang">${t("settings.lang")}</label>
      <select id="lang">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === st.lang ? "selected" : ""}>${v}</option>`).join("")}</select>

      <p class="field-label">${t("settings.mode")}</p>
      <label class="radio"><input type="radio" name="mode" value="demo" ${st.mode !== "ai" ? "checked" : ""}> ${t("settings.mode.demo")}</label>
      <label class="radio"><input type="radio" name="mode" value="ai" ${st.mode === "ai" ? "checked" : ""}> ${t("settings.mode.ai")}</label>

      <div id="aiFields" ${st.mode === "ai" ? "" : "hidden"}>
        <label class="field-label" for="apiKey">${t("settings.key")}</label>
        <input type="password" id="apiKey" autocomplete="off" placeholder="sk-ant-..." value="${esc(st.apiKey)}">
        <p class="muted small">🔒 ${t("settings.key.hint")}</p>
        <label class="field-label" for="model">${t("settings.model")}</label>
        <select id="model">${Object.entries(AI_MODELS).map(([k, v]) => `<option value="${k}" ${k === st.model ? "selected" : ""}>${v}</option>`).join("")}</select>
      </div>

      <button class="btn btn-primary btn-wide" id="saveSettings">${t("settings.save")}</button>
    </section>

    <section class="card">
      <h3>${t("settings.about")}</h3>
      <p>${t("settings.about.text")}</p>
      <button class="btn btn-ghost" id="clearAll">🗑 ${t("settings.clear")}</button>
    </section>`;

  view.querySelectorAll("input[name=mode]").forEach(r => r.onchange = () => { $("#aiFields", view).hidden = r.value !== "ai" || !r.checked; });
  $("#saveSettings", view).onclick = () => {
    st.lang = $("#lang", view).value;
    st.mode = view.querySelector("input[name=mode]:checked").value;
    st.apiKey = $("#apiKey", view).value.trim();
    st.model = $("#model", view).value;
    store.set("settings", st);
    setLang(st.lang);
    toast(t("settings.saved"));
    render();
  };
  $("#clearAll", view).onclick = () => {
    if (!confirm(t("settings.clear.confirm"))) return;
    store.set("discoveries", []);
    store.set("topicsDone", []);
    state.quiz = null;
    toast("✓");
  };
}

/* ---------- Старт ---------- */
(async function init() {
  setLang(state.settings.lang);
  try {
    await loadData();
  } catch {
    $("#view").innerHTML = `<div class="empty"><p>${t("error.data")}</p></div>`;
    return;
  }
  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#/quiz")) state.quiz = null;
    render();
  });
  render();
})();
