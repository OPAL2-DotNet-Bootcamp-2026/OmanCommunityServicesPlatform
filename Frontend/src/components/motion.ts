/**
 * Entrance animations, counters, skeletons and busy-button handling. Ported
 * from the ocsp.animations half of animations.js.
 *
 * Every effect here checks prefers-reduced-motion first and falls back to the
 * finished state rather than a shorter animation, so a reader who has asked for
 * stillness gets stillness.
 */

import { asText } from "../text";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const buttonSnapshots = new WeakMap<
  HTMLButtonElement,
  { html: string; disabled: boolean; ariaBusy: string | null }
>();
const counterFrames = new WeakMap<HTMLElement, number>();
const staticCounterData = new WeakMap<HTMLElement, CounterText>();
const skeletonAnnouncements = new WeakMap<
  HTMLElement,
  { observer: MutationObserver; status: HTMLElement }
>();
const pendingRevealElements = new Set<HTMLElement>();

let revealObserver: IntersectionObserver | null = null;
let counterObserver: IntersectionObserver | null = null;
let pageInitialized = false;

/** Page furniture: appears once, on load. */
const STATIC_REVEAL_SELECTOR = [
  ".page-hero__grid > *",
  ".section-heading",
  ".process-card",
  ".stat-block",
  ".cta-panel",
  ".help-strip__main",
  ".auth-card",
  ".issue-stat"
].join(",");

/** Data-driven content: re-rendered whenever filters or requests change it. */
const CONTENT_REVEAL_SELECTOR = [
  ".issue-card",
  ".notification-card",
  ".timeline-item",
  ".comment-card",
  ".issues-empty-state",
  "#activeFilterChips > .badge"
].join(",");

export function prefersReducedMotion(): boolean {
  return reducedMotionQuery.matches;
}

function elementsWithin(root: ParentNode | HTMLElement | null, selector: string): HTMLElement[] {
  if (!root || !selector) {
    return [];
  }

  const elements: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches(selector)) {
    elements.push(root);
  }
  elements.push(...root.querySelectorAll<HTMLElement>(selector));
  return elements;
}

/** Strips the animation state so the element is left exactly as authored. */
function finishReveal(element: HTMLElement): void {
  revealObserver?.unobserve(element);
  pendingRevealElements.delete(element);
  element.classList.remove("ocsp-motion-enter", "is-visible");
  element.style.removeProperty("--ocsp-motion-delay");
  element.style.removeProperty("--ocsp-motion-distance");
  element.style.removeProperty("--ocsp-motion-duration");
  element.dataset.ocspMotionComplete = "true";
}

function showReveal(element: HTMLElement): void {
  if (element.dataset.ocspMotionComplete === "true") {
    return;
  }
  if (prefersReducedMotion()) {
    finishReveal(element);
    return;
  }

  requestAnimationFrame(() => {
    element.classList.add("is-visible");

    let cleanupTimer = 0;
    const cleanup = (event?: TransitionEvent): void => {
      if (event && !["opacity", "translate"].includes(event.propertyName)) {
        return;
      }
      window.clearTimeout(cleanupTimer);
      element.removeEventListener("transitionend", cleanup);
      finishReveal(element);
    };
    element.addEventListener("transitionend", cleanup);

    // transitionend can be missed if the element is removed mid-flight, so a
    // timer guarantees the cleanup runs and the class never sticks.
    const duration =
      Number.parseFloat(element.style.getPropertyValue("--ocsp-motion-duration")) || 240;
    const delay = Number.parseFloat(element.style.getPropertyValue("--ocsp-motion-delay")) || 0;
    cleanupTimer = window.setTimeout(() => cleanup(), duration + delay + 100);
  });
}

function getRevealObserver(): IntersectionObserver | null {
  if (revealObserver || !("IntersectionObserver" in window)) {
    return revealObserver;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        revealObserver?.unobserve(entry.target);
        showReveal(entry.target as HTMLElement);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
  );
  return revealObserver;
}

/**
 * Filters can replace cards before they ever enter the viewport. Releasing the
 * detached nodes stops repeated renders retaining elements nobody will see.
 */
function cleanupDisconnectedReveals(): void {
  pendingRevealElements.forEach((element) => {
    if (!element.isConnected) {
      finishReveal(element);
    }
  });
}

export interface RevealOptions {
  stagger?: boolean;
  interval?: number;
  duration?: number;
  distance?: number;
  maximumDelay?: number;
}

/**
 * Reveals only elements not already animated, so a re-render does not replay
 * the entrance for rows that were already on screen.
 */
export function revealList(
  container: ParentNode | HTMLElement | null,
  selector: string,
  options: RevealOptions = {}
): HTMLElement[] {
  cleanupDisconnectedReveals();

  const settings = {
    stagger: true,
    interval: 36,
    duration: 240,
    distance: 10,
    maximumDelay: 120,
    ...options
  };

  const elements = elementsWithin(container, selector).filter(
    (element) => element.dataset.ocspMotionInitialized !== "true"
  );

  elements.forEach((element, index) => {
    // Capped, so a long list does not end with a visible wait on the last row.
    const delay = settings.stagger
      ? Math.min(index * settings.interval, settings.maximumDelay)
      : 0;

    element.dataset.ocspMotionInitialized = "true";
    element.classList.add("ocsp-motion-enter");
    element.style.setProperty("--ocsp-motion-delay", `${delay}ms`);
    element.style.setProperty("--ocsp-motion-distance", `${settings.distance}px`);
    element.style.setProperty("--ocsp-motion-duration", `${settings.duration}ms`);

    if (prefersReducedMotion()) {
      finishReveal(element);
      return;
    }

    const observer = getRevealObserver();
    if (observer) {
      pendingRevealElements.add(element);
      observer.observe(element);
    } else {
      showReveal(element);
    }
  });

  return elements;
}

/** Reveals both the page furniture and the data-driven content under a root. */
export function revealWithin(root: ParentNode | HTMLElement | null, options: RevealOptions = {}): void {
  revealList(root, STATIC_REVEAL_SELECTOR, {
    stagger: options.stagger !== false,
    interval: options.interval || 36,
    duration: options.duration || 260,
    distance: options.distance || 12,
    maximumDelay: 140
  });
  revealList(root, CONTENT_REVEAL_SELECTOR, {
    stagger: options.stagger !== false,
    interval: options.interval || 28,
    duration: options.duration || 220,
    distance: options.distance || 8,
    maximumDelay: 100
  });
}

interface CounterText {
  target: number;
  prefix: string;
  suffix: string;
  useGrouping: boolean;
  finalText: string;
}

export interface CountOptions {
  duration?: number;
  startValue?: number | null;
  minimumDigits?: number;
  useGrouping?: boolean;
  prefix?: string;
  suffix?: string;
  format?: ((value: number) => string) | null;
}

function numericValue(value: unknown): number | null {
  // asText, not String: an object would stringify to "[object Object]" and
  // then parse to NaN, which hides the real problem.
  const number = Number(asText(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function visibleNumberFromText(value: string | null): number | null {
  const match = String(value ?? "").match(/-?\d[\d,]*/);
  return match ? numericValue(match[0]) : null;
}

/** Animates a number in place without disturbing its label or layout. */
export function countTo(
  element: HTMLElement | null,
  targetValue: number,
  options: CountOptions = {}
): void {
  if (!element) {
    return;
  }

  const target = Number(targetValue);
  if (!Number.isFinite(target)) {
    return;
  }

  const settings = {
    duration: 520,
    startValue: null as number | null,
    minimumDigits: 1,
    useGrouping: false,
    prefix: "",
    suffix: "",
    format: null as ((value: number) => string) | null,
    ...options
  };

  const formatter =
    typeof settings.format === "function"
      ? settings.format
      : (value: number): string =>
          `${settings.prefix}${Math.round(value).toLocaleString("en-US", {
            minimumIntegerDigits: settings.minimumDigits,
            useGrouping: settings.useGrouping
          })}${settings.suffix}`;

  const current =
    settings.startValue === null
      ? visibleNumberFromText(element.textContent)
      : Number(settings.startValue);
  const start = Number.isFinite(current) ? (current as number) : 0;

  const previousFrame = counterFrames.get(element);
  if (previousFrame) {
    cancelAnimationFrame(previousFrame);
    counterFrames.delete(element);
  }

  if (prefersReducedMotion() || settings.duration <= 0 || start === target) {
    element.textContent = formatter(target);
    return;
  }

  const startedAt = performance.now();
  const step = (now: number): void => {
    const progress = Math.min((now - startedAt) / settings.duration, 1);
    // Ease-out quadratic: quick at first, and it keeps the final steps visible,
    // which reads better for the small counts on these dashboards.
    const eased = 1 - Math.pow(1 - progress, 2);
    const nextText = formatter(start + (target - start) * eased);

    if (element.textContent !== nextText) {
      element.textContent = nextText;
    }

    if (progress < 1) {
      counterFrames.set(element, requestAnimationFrame(step));
    } else {
      element.textContent = formatter(target);
      counterFrames.delete(element);
    }
  };
  counterFrames.set(element, requestAnimationFrame(step));
}

function parseCounterText(element: HTMLElement): CounterText | null {
  const text = String(element.textContent ?? "").trim();
  const match = text.match(/-?\d[\d,]*/);
  if (!match) {
    return null;
  }

  const target = numericValue(match[0]);
  if (target === null) {
    return null;
  }

  const startIndex = match.index ?? 0;
  return {
    target,
    prefix: text.slice(0, startIndex),
    suffix: text.slice(startIndex + match[0].length),
    useGrouping: match[0].includes(","),
    finalText: text
  };
}

function getCounterObserver(): IntersectionObserver | null {
  if (counterObserver || !("IntersectionObserver" in window)) {
    return counterObserver;
  }

  counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        counterObserver?.unobserve(entry.target);
        const data = staticCounterData.get(entry.target as HTMLElement);
        if (!data) {
          return;
        }
        countTo(entry.target as HTMLElement, data.target, {
          startValue: 0,
          useGrouping: data.useGrouping,
          format: (value) =>
            `${data.prefix}${Math.round(value).toLocaleString("en-US", {
              useGrouping: data.useGrouping
            })}${data.suffix}`
        });
      });
    },
    { threshold: 0.45 }
  );
  return counterObserver;
}

/**
 * Finds the statistics already rendered in the markup and counts them up when
 * they scroll into view. The original text becomes the aria-label first, so a
 * screen reader gets the real figure rather than whatever frame it lands on.
 */
function initializeStaticCounters(root: ParentNode): void {
  const selector = ".stat-block__value, .page-hero--home .hero-panel__value.mb-0";

  elementsWithin(root, selector).forEach((element) => {
    if (element.dataset.ocspCounterInitialized === "true") {
      return;
    }
    const data = parseCounterText(element);
    if (!data) {
      return;
    }

    element.dataset.ocspCounterInitialized = "true";
    if (prefersReducedMotion()) {
      return;
    }
    if (!element.hasAttribute("aria-label")) {
      element.setAttribute("aria-label", data.finalText);
    }

    staticCounterData.set(element, data);
    element.textContent = `${data.prefix}0${data.suffix}`;

    const observer = getCounterObserver();
    if (observer) {
      observer.observe(element);
    } else {
      countTo(element, data.target, {
        startValue: 0,
        useGrouping: data.useGrouping,
        prefix: data.prefix,
        suffix: data.suffix
      });
    }
  });
}

/** Replays a short pulse only when the value it represents actually changed. */
export function pulse(element: HTMLElement | null, value?: string | number): void {
  if (!element) {
    return;
  }

  const nextValue = String(value ?? element.textContent ?? "");
  if (element.dataset.ocspPulseValue === nextValue) {
    return;
  }
  element.dataset.ocspPulseValue = nextValue;

  if (prefersReducedMotion() || element.hidden) {
    return;
  }

  element.classList.remove("ocsp-notification-pulse");
  void element.offsetWidth; // forces a reflow so the animation restarts
  element.classList.add("ocsp-notification-pulse");
  element.addEventListener(
    "animationend",
    () => element.classList.remove("ocsp-notification-pulse"),
    { once: true }
  );
}

export function revealStatus(element: HTMLElement | null): void {
  if (
    !element ||
    element.hidden ||
    element.classList.contains("d-none") ||
    prefersReducedMotion()
  ) {
    return;
  }

  element.classList.remove("ocsp-status-enter");
  void element.offsetWidth;
  element.classList.add("ocsp-status-enter");
  element.addEventListener(
    "animationend",
    () => element.classList.remove("ocsp-status-enter"),
    { once: true }
  );
}

/**
 * Swaps a button for a spinner while a request runs, and restores the original
 * markup exactly afterwards - including whether it was already disabled.
 */
export function setButtonBusy(
  button: HTMLButtonElement | null,
  isBusy: boolean,
  loadingLabel?: string
): void {
  if (!button) {
    return;
  }

  if (isBusy) {
    if (!buttonSnapshots.has(button)) {
      buttonSnapshots.set(button, {
        html: button.innerHTML,
        disabled: button.disabled,
        ariaBusy: button.getAttribute("aria-busy")
      });
    }

    const spinner = document.createElement("span");
    spinner.className = "spinner-border spinner-border-sm";
    spinner.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = loadingLabel || "Working...";

    button.replaceChildren(spinner, label);
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.classList.add("ocsp-button-busy");
    return;
  }

  const snapshot = buttonSnapshots.get(button);
  if (snapshot) {
    button.innerHTML = snapshot.html;
    button.disabled = snapshot.disabled;
    if (snapshot.ariaBusy === null) {
      button.removeAttribute("aria-busy");
    } else {
      button.setAttribute("aria-busy", snapshot.ariaBusy);
    }
    buttonSnapshots.delete(button);
  }
  button.classList.remove("ocsp-button-busy");
}

function skeletonBlock(className: string): HTMLElement {
  const block = document.createElement("span");
  block.className = `ocsp-skeleton__block ${className}`;
  return block;
}

function removeSkeletonAnnouncement(container: HTMLElement): void {
  const announcement = skeletonAnnouncements.get(container);
  if (!announcement) {
    return;
  }
  announcement.observer.disconnect();
  announcement.status.remove();
  skeletonAnnouncements.delete(container);
}

export interface SkeletonOptions {
  count?: number;
  variant?: "issue" | "notification";
  label?: string;
}

/**
 * Placeholder cards that reserve the final layout while a request runs, so the
 * page does not collapse and then jump.
 */
export function renderSkeletons(
  container: HTMLElement | null,
  options: SkeletonOptions = {}
): void {
  if (!container) {
    return;
  }

  const settings = { count: 3, variant: "issue" as const, label: "Loading content...", ...options };
  removeSkeletonAnnouncement(container);
  container.setAttribute("aria-busy", "true");

  // The live status sits OUTSIDE the busy region, because assistive technology
  // ignores updates inside aria-busy. It removes itself when busy clears.
  const status = document.createElement("span");
  status.className = "visually-hidden";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  container.before(status);

  const observer = new MutationObserver(() => {
    if (container.getAttribute("aria-busy") !== "true") {
      removeSkeletonAnnouncement(container);
    }
  });
  observer.observe(container, { attributes: true, attributeFilter: ["aria-busy"] });
  skeletonAnnouncements.set(container, { observer, status });

  requestAnimationFrame(() => {
    if (status.isConnected) {
      status.textContent = settings.label;
    }
  });

  const list = document.createElement("div");
  list.className = `ocsp-skeleton-list ocsp-skeleton-list--${settings.variant}`;
  list.setAttribute("aria-hidden", "true");

  for (let index = 0; index < settings.count; index += 1) {
    const card = document.createElement("article");
    card.className = `ocsp-skeleton-card ocsp-skeleton-card--${settings.variant}`;
    card.append(
      skeletonBlock(
        settings.variant === "notification" ? "ocsp-skeleton__avatar" : "ocsp-skeleton__media"
      )
    );

    const content = document.createElement("div");
    content.className = "ocsp-skeleton__content";
    content.append(
      skeletonBlock("ocsp-skeleton__eyebrow"),
      skeletonBlock("ocsp-skeleton__title"),
      skeletonBlock("ocsp-skeleton__line"),
      skeletonBlock("ocsp-skeleton__line ocsp-skeleton__line--short")
    );
    card.append(content);
    list.append(card);
  }

  const fragment = document.createDocumentFragment();
  fragment.append(list);
  container.replaceChildren(fragment);
}

/**
 * Runs once per page. Called from bootstrap.ts rather than on import, so the
 * module has no side effect merely by being loaded.
 */
export function initializePage(): void {
  if (pageInitialized) {
    return;
  }
  pageInitialized = true;

  document.documentElement.classList.add("ocsp-motion-enabled");
  revealWithin(document);
  initializeStaticCounters(document);

  // Bootstrap fires this for the citizen dialogs; the staff :target dialogs
  // animate in CSS instead.
  document.addEventListener("shown.bs.modal", (event) => {
    revealWithin(event.target as HTMLElement, { stagger: true, interval: 45, distance: 8 });
  });
}
