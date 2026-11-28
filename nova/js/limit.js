/* =====================================================================
   Лимит NOVA AI и тарифы (демо для презентации, без настоящей оплаты)
   • Free: 20 сообщений ассистенту в день. Счётчик в localStorage
     (nova.ai.usage = {day: "ГГГГ-ММ-ДД", n}), обнуляется в полночь по местному времени.
   • «Попробовать Premium (демо)» снимает лимит (nova.premium = {demo: true}).
   Подключается в index.html перед js/ai.js.
   ===================================================================== */
"use strict";

const FREE_DAILY_LIMIT = 20;

const LIMIT_TXT = {
  ru: {
    nav: "Premium", title: "NOVA Premium", sub: "Тарифы NOVA · демо-версия для презентации",
    demoNote: "Это демонстрация: настоящая оплата не подключена, деньги не списываются.",
    free: "Free", premium: "Premium", school: "Школа",
    freePrice: "0 ₸", premiumPrice: "1 490 ₸ / мес", schoolPrice: "по договору",
    freeFor: "Для каждого ученика", premiumFor: "Для тех, кто готовится к олимпиадам и ЕНТ", schoolFor: "Для классов и школ",
    current: "Текущий тариф", tryBtn: "Попробовать Premium (демо)", backFree: "Вернуться на Free", contact: "Оставить заявку (демо)",
    activated: "Premium (демо) включён — лимит снят ✓", deactivated: "Снова бесплатная версия",
    schoolToast: "Это демо: заявка никуда не отправлена",
    features: [
      ["Все предметы и темы 5–11 класса", 1, 1, 1],
      ["Тесты на 4 уровнях и прогресс", 1, 1, 1],
      ["NOVA AI в браузере", "20 сообщений в день", "без ограничений", "без ограничений"],
      ["Упрощённый режим без WebGPU", 1, 1, 1],
      ["Разбор олимпиадных задач с решениями", 1, 1, 1],
      ["Приоритетные новые функции", 0, 1, 1],
      ["Кабинет учителя и отчёты по классу", 0, 0, 1],
      ["Подключение всей школы", 0, 0, 1]
    ],
    todayUsed: "Сегодня использовано: {n} из {max}",
    usageUnlimited: "Сегодня отправлено сообщений: {n} · лимита нет"
  },
  kz: {
    nav: "Premium", title: "NOVA Premium", sub: "NOVA тарифтері · таныстыруға арналған демо-нұсқа",
    demoNote: "Бұл демонстрация: нақты төлем қосылмаған, ақша алынбайды.",
    free: "Free", premium: "Premium", school: "Мектеп",
    freePrice: "0 ₸", premiumPrice: "1 490 ₸ / ай", schoolPrice: "келісім бойынша",
    freeFor: "Әр оқушыға", premiumFor: "Олимпиада мен ҰБТ-ға дайындалатындарға", schoolFor: "Сыныптар мен мектептерге",
    current: "Ағымдағы тариф", tryBtn: "Premium-ды байқап көру (демо)", backFree: "Free-ге оралу", contact: "Өтінім қалдыру (демо)",
    activated: "Premium (демо) қосылды — лимит алынды ✓", deactivated: "Қайтадан тегін нұсқа",
    schoolToast: "Бұл демо: өтінім ешқайда жіберілмеді",
    features: [
      ["5–11 сыныптың барлық пәндері мен тақырыптары", 1, 1, 1],
      ["4 деңгейлі тесттер және прогресс", 1, 1, 1],
      ["Браузердегі NOVA AI", "күніне 20 хабарлама", "шектеусіз", "шектеусіз"],
      ["WebGPU-сыз жеңілдетілген режим", 1, 1, 1],
      ["Олимпиадалық есептерді шешімімен талдау", 1, 1, 1],
      ["Жаңа мүмкіндіктер бірінші болып", 0, 1, 1],
      ["Мұғалім кабинеті және сынып бойынша есептер", 0, 0, 1],
      ["Бүкіл мектепті қосу", 0, 0, 1]
    ],
    todayUsed: "Бүгін пайдаланылды: {n} / {max}",
    usageUnlimited: "Бүгін жіберілген хабарламалар: {n} · лимит жоқ"
  }
};
const lt = (key, vars = {}) => {
  const v = (LIMIT_TXT[getLang()] || LIMIT_TXT.ru)[key] ?? LIMIT_TXT.ru[key];
  return typeof v === "string" ? v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : v;
};

/* --- Счётчик --- */
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function aiUsage() {
  const u = store.get("ai.usage", null);
  return u && u.day === todayKey() ? u : { day: todayKey(), n: 0 }; // новый день — счётчик с нуля
}
const isPremium = () => !!store.get("premium", null)?.demo;
const aiLeft = () => Math.max(0, FREE_DAILY_LIMIT - aiUsage().n);
function aiCanSend() { return isPremium() || aiLeft() > 0; }
function aiSpend() { const u = aiUsage(); u.n++; store.set("ai.usage", u); aiLimitRender(); }

function aiLimitRender() {
  const el = document.getElementById("aiLimit");
  if (!el) return;
  el.hidden = false;
  if (isPremium()) { el.textContent = "✦ " + at("unlimited"); el.classList.remove("low"); return; }
  const left = aiLeft();
  el.textContent = at("leftToday", { n: left });
  el.classList.toggle("low", left <= 3);
}

/** Карточка в чате, когда лимит исчерпан. */
function aiLimitCard() {
  const old = document.querySelector(".msg.limit-card");
  if (old) old.remove();
  aiMsg("bot limit-card", `
    <b>⏳ ${at("limitTitle")}</b>
    <p class="small" style="margin:4px 0 10px">${at("limitText", { n: FREE_DAILY_LIMIT })}</p>
    <a class="btn btn-primary btn-sm" href="#/premium">${at("premiumBtn")}</a>`, { noFoot: true });
}

/* --- Страница NOVA Premium --- */
function renderPremium(view) {
  const prem = isPremium();
  const u = aiUsage();
  const cell = v => v === 1 ? `<span class="yes">✓</span>` : v === 0 ? `<span class="no">—</span>` : `<span>${esc(v)}</span>`;
  const plan = (id, name, price, forWho, i, action) => `
    <section class="card plan ${id === "premium" ? "featured" : ""} ${(prem ? "premium" : "free") === id ? "current" : ""}">
      ${(prem ? "premium" : "free") === id ? `<span class="chip on plan-badge">${lt("current")}</span>` : ""}
      <h3>${name}</h3>
      <div class="price">${price}</div>
      <p class="small muted">${forWho}</p>
      <ul class="feat">${lt("features").map(f => `<li class="${f[i] === 0 ? "off" : ""}">${cell(f[i])}<span>${esc(f[0])}</span></li>`).join("")}</ul>
      ${action}
    </section>`;
  view.innerHTML = `
    ${modHead("✦", lt("title"), lt("sub"))}
    <p class="demo-note">🧪 ${lt("demoNote")}</p>
    <p class="small muted" id="usageLine">${prem ? lt("usageUnlimited", { n: u.n }) : lt("todayUsed", { n: u.n, max: FREE_DAILY_LIMIT })}</p>
    <div class="plans">
      ${plan("free", lt("free"), lt("freePrice"), lt("freeFor"), 1, prem ? `<button class="btn btn-ghost" id="toFree">${lt("backFree")}</button>` : "")}
      ${plan("premium", lt("premium"), lt("premiumPrice"), lt("premiumFor"), 2, prem ? "" : `<button class="btn btn-primary" id="tryPremium">${lt("tryBtn")}</button>`)}
      ${plan("school", lt("school"), lt("schoolPrice"), lt("schoolFor"), 3, `<button class="btn btn-soft" id="schoolReq">${lt("contact")}</button>`)}
    </div>`;
  const tp = view.querySelector("#tryPremium");
  if (tp) tp.onclick = () => { store.set("premium", { demo: true, since: new Date().toISOString() }); toast(lt("activated")); aiLimitRender(); renderPremium(view); };
  const tf = view.querySelector("#toFree");
  if (tf) tf.onclick = () => { store.set("premium", null); toast(lt("deactivated")); aiLimitRender(); renderPremium(view); };
  view.querySelector("#schoolReq").onclick = () => toast(lt("schoolToast"));
}

routes.premium = renderPremium;
if (location.hash.startsWith("#/premium")) setTimeout(router, 0);
