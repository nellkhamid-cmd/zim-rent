/* КЦ «ЗИМ Галерея», аренда: показ при прокрутке, маска телефона, форма заявки */
(function () {
  "use strict";

  /* Настройки внедрения */
  const CONFIG = {
    FORM_ENDPOINT: "",   // URL обработчика заявок (CRM / вебхук). Пусто: заявка никуда не уходит, показывается только экран успеха
    YM_COUNTER: null,    // номер счётчика Яндекс Метрики
    YM_GOAL: "rent_lead"
  };

  /* ---------- Показ при прокрутке ---------- */
  const items = document.querySelectorAll("[data-r]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Форма ---------- */
  const form = document.getElementById("rent-form");
  if (!form) return;
  const name = form.elements.name;
  const phone = form.elements.phone;
  const consent = form.elements.consent;
  const ads = form.elements.ads_consent;
  const status = form.querySelector(".form__status");
  const success = document.getElementById("rent-success");
  let tried = false;

  /* метки рекламы из адреса страницы */
  const params = new URLSearchParams(location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
    if (form.elements[k] && params.get(k)) form.elements[k].value = params.get(k);
  });

  const digits = (v) => v.replace(/\D/g, "");
  const formatPhone = (v) => {
    let n = digits(v);
    if (v.trim().startsWith("+7")) n = n.slice(1);
    else if (n.length >= 11 && /^[78]/.test(n)) n = n.slice(1);
    n = n.slice(0, 10);
    let out = "+7";
    if (n.length) out += " (" + n.slice(0, 3);
    if (n.length >= 3) out += ")";
    if (n.length > 3) out += " " + n.slice(3, 6);
    if (n.length > 6) out += "-" + n.slice(6, 8);
    if (n.length > 8) out += "-" + n.slice(8, 10);
    return out;
  };
  phone.addEventListener("focus", () => { if (!phone.value) phone.value = "+7 "; });
  phone.addEventListener("blur", () => { if (digits(phone.value).length <= 1) phone.value = ""; });
  phone.addEventListener("input", () => {
    const end = phone.selectionStart === phone.value.length;
    phone.value = formatPhone(phone.value);
    if (end) phone.setSelectionRange(phone.value.length, phone.value.length);
    if (tried) validate();
  });
  [name, consent, ads].forEach((el) => el.addEventListener("input", () => { if (tried) validate(); }));
  [consent, ads].forEach((el) => el.addEventListener("change", () => { if (tried) validate(); }));

  function setErr(input, errId, bad) {
    const err = document.getElementById(errId);
    input.setAttribute("aria-invalid", bad ? "true" : "false");
    if (bad) input.setAttribute("aria-describedby", errId); else input.removeAttribute("aria-describedby");
    if (err) err.hidden = !bad;
  }
  function validate() {
    const okName = name.value.trim().length >= 2;
    const okPhone = digits(phone.value).replace(/^7/, "").length === 10;
    setErr(name, "f-name-err", !okName);
    setErr(phone, "f-phone-err", !okPhone);
    setErr(consent, "f-consent-err", !consent.checked);
    setErr(ads, "f-ads-err", !ads.checked);
    return !okName ? name : !okPhone ? phone : !consent.checked ? consent : !ads.checked ? ads : null;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    tried = true;
    const bad = validate();
    if (bad) { bad.focus(); return; }
    const btn = form.querySelector('[type="submit"]');
    btn.setAttribute("aria-busy", "true");
    status.textContent = "Отправляем...";
    const data = Object.fromEntries(new FormData(form).entries());
    data.consent = true;
    data.ads_consent = true;
    data.offer = "Аренда пространства";
    data.page = location.href;
    data.submitted_at = new Date().toISOString();
    try {
      if (CONFIG.FORM_ENDPOINT) {
        const res = await fetch(CONFIG.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error("HTTP " + res.status);
      } else {
        await new Promise((r) => setTimeout(r, 500));
        console.warn("[ЗИМ] FORM_ENDPOINT не задан: заявка никуда не отправлена");
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "rent_lead", format: data.event_format || "" });
      if (window.ym && CONFIG.YM_COUNTER) window.ym(CONFIG.YM_COUNTER, "reachGoal", CONFIG.YM_GOAL);
      status.textContent = "";
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ block: "center" });
    } catch (err) {
      status.textContent = "Не получилось отправить. Проверьте интернет или позвоните нам: 8 (987) 955-33-55";
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });
})();
