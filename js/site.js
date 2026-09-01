const steps = {
  understand: { kicker: "PROJECT CONTEXT", main: "Reading project conventions, workspace files, session context, and available tools.", code: ["workspace / 18 files indexed", "instructions / AGENTS.md applied", "tools / 12 available within policy"], status: "CONTEXT READY" },
  plan: { kicker: "EXECUTION PLAN", main: "Turning a request into a sequence of reviewable steps before any file is changed.", code: ["plan / inspect the onboarding route", "propose / create the workspace picker", "verify / run the targeted checks"], status: "PLAN READY" },
  act: { kicker: "APPROVED ACTIONS", main: "Applying the accepted change set and retaining each tool call with its project evidence.", code: ["write / src/widgets/home/index.tsx", "write / src/renderer/locales/zh-CN.json", "terminal / npm run typecheck"], status: "CHANGES STAGED" },
  verify: { kicker: "VERIFICATION RESULT", main: "Showing the actual checks that ran, the outcome they produced, and anything that still needs attention.", code: ["typecheck / passed", "targeted tests / passed", "change set / ready for your review"], status: "READY TO REVIEW" },
};

const panel = document.querySelector("[data-run-panel]");
const runSteps = document.querySelectorAll(".run-step");
runSteps.forEach((button) => {
  button.addEventListener("click", () => {
    const step = steps[button.dataset.step];
    if (!step || !panel) return;
    runSteps.forEach((item) => { const selected = item === button; item.classList.toggle("is-active", selected); item.setAttribute("aria-selected", String(selected)); });
    panel.querySelector(".run-kicker").textContent = step.kicker;
    panel.querySelector(".run-main").textContent = step.main;
    panel.querySelector(".run-status").textContent = step.status;
    panel.querySelector(".run-code").innerHTML = step.code.map((line) => `<span>✓</span> ${line}`).join("<br />");
  });
});

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
menuToggle?.addEventListener("click", () => { const isOpen = menuToggle.getAttribute("aria-expanded") === "true"; menuToggle.setAttribute("aria-expanded", String(!isOpen)); siteNav?.classList.toggle("is-open", !isOpen); });
siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { menuToggle?.setAttribute("aria-expanded", "false"); siteNav.classList.remove("is-open"); }));
