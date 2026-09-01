const LANGUAGE_STORAGE_KEY = "daedalus-web-language";
const SUPPORTED_LANGUAGES = new Set(["en", "zh-CN"]);

let translations = null;
let activeLanguage = "en";

const panel = document.querySelector("[data-run-panel]");
const timeline = document.querySelector("[data-timeline]");
const timelineSteps = document.querySelectorAll(".timeline-step");
const timelineTriggers = document.querySelectorAll(".timeline-trigger");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

let activeRunStep = "understand";


function getValue(object, path) {
  return path.split(".").reduce((value, segment) => value?.[segment], object);
}


function getInitialLanguage() {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED_LANGUAGES.has(requestedLanguage)) return requestedLanguage;

  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.has(savedLanguage)) return savedLanguage;
  } catch {
    // 存储不可用时继续使用浏览器语言
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}


function renderRunState(stepName) {
  const state = getValue(translations[activeLanguage], `run.states.${stepName}`);
  if (!state || !panel) return;

  panel.querySelector(".run-kicker").textContent = state.kicker;
  panel.querySelector(".run-main").textContent = state.main;
  panel.querySelector(".run-status").textContent = state.status;

  const code = panel.querySelector(".run-code");
  code.replaceChildren();
  state.code.forEach((line, index) => {
    const check = document.createElement("span");
    check.textContent = "✓";
    code.append(check, ` ${line}`);
    if (index < state.code.length - 1) code.append(document.createElement("br"));
  });
}


function setRunStep(stepName) {
	if (!translations || !timeline || !panel) return;

	activeRunStep = stepName;
	const stepCount = timelineSteps.length - 1;
	const stepIndex = [...timelineSteps].findIndex((step) => step.dataset.step === stepName);

	timelineSteps.forEach((step) => {
		const selected = step.dataset.step === stepName;
		step.classList.toggle("is-active", selected);
		step.querySelector(".timeline-trigger")?.setAttribute("aria-current", selected ? "step" : "false");
	});

	if (stepIndex >= 0 && stepCount > 0) {
		timeline.style.setProperty("--timeline-progress", String(stepIndex / stepCount));
	}

	renderRunState(stepName);
}


function renderTranslations() {
  const locale = translations[activeLanguage];
  document.documentElement.lang = locale.meta.htmlLang;
  document.title = locale.meta.title;
  document.querySelector("#meta-description")?.setAttribute("content", locale.meta.description);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getValue(locale, element.dataset.i18n);
    if (typeof value === "string") element.textContent = value;
  });

  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = getValue(locale, element.dataset.i18nHtml);
    if (typeof value === "string") element.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = getValue(locale, element.dataset.i18nAriaLabel);
    if (typeof value === "string") element.setAttribute("aria-label", value);
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const value = getValue(locale, element.dataset.i18nAlt);
    if (typeof value === "string") element.setAttribute("alt", value);
  });

  document.querySelectorAll("[data-i18n-href]").forEach((element) => {
    const value = getValue(locale, element.dataset.i18nHref);
    if (typeof value === "string") element.setAttribute("href", value);
  });

	setRunStep(activeRunStep);
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === activeLanguage));
  });
}


function setLanguage(language) {
  if (!translations || !SUPPORTED_LANGUAGES.has(language)) return;
  activeLanguage = language;
  renderTranslations();

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // 存储不可用时仍允许当前页面切换语言
  }

  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState(null, "", url);
}


function bindInteractions() {
	timelineTriggers.forEach((button) => {
		button.addEventListener("click", () => {
			const stepName = button.dataset.step;
			const target = button.closest(".timeline-step");
			setRunStep(stepName);
			target?.scrollIntoView({
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
				block: "center",
			});
		});
	});

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav?.classList.toggle("is-open", !isOpen);
  });

  siteNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle?.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    });
  });
}


function observeTimeline() {
	if (!timeline || !("IntersectionObserver" in window)) return;

	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;

			const readingLine = window.innerHeight * 0.43;
			const focusedStep = [...timelineSteps].reduce((closest, step) => {
				const bounds = step.getBoundingClientRect();
				const distance = bounds.top <= readingLine && bounds.bottom >= readingLine
					? 0
					: Math.min(Math.abs(bounds.top - readingLine), Math.abs(bounds.bottom - readingLine));

				if (!closest || distance < closest.distance) return { step, distance };
				return closest;
			}, null)?.step;

			if (focusedStep) setRunStep(focusedStep.dataset.step);
		},
		{ rootMargin: "-40% 0px -45% 0px", threshold: 0 },
	);

	timelineSteps.forEach((step) => observer.observe(step));
}


async function initialize() {
  const response = await fetch("js/translations.json");
  if (!response.ok) throw new Error(`Unable to load translations: ${response.status}`);

  translations = await response.json();
	activeLanguage = getInitialLanguage();
	renderTranslations();
	bindInteractions();
	observeTimeline();
}


initialize().catch((error) => {
  console.error("Daedalus Studio translations could not be loaded.", error);
});
