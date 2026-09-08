(function initializeOcspAnimations(global) {
  "use strict";

  const document = global.document;
  const ocsp = global.OCSP = global.OCSP || {};
  const reducedMotionQuery = global.matchMedia("(prefers-reduced-motion: reduce)");
  const buttonSnapshots = new WeakMap();
  const counterFrames = new WeakMap();
  const staticCounterData = new WeakMap();
  const skeletonAnnouncements = new WeakMap();
  const pendingRevealElements = new Set();
  const toastRecords = new Map();
  const toastKeyIndex = new Map();
  let revealObserver = null;
  let counterObserver = null;
  let toastViewport = null;
  let toastSequence = 0;
  let pageInitialized = false;

  const TOAST_TONES = Object.freeze({
    success: { title: "Success", icon: "bi-check-circle-fill", duration: 4200 },
    danger: { title: "Failed", icon: "bi-exclamation-octagon-fill", duration: 6200 },
    warning: { title: "Attention", icon: "bi-exclamation-triangle-fill", duration: 5600 },
    info: { title: "Update", icon: "bi-info-circle-fill", duration: 4200 }
  });

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

  const CONTENT_REVEAL_SELECTOR = [
    ".issue-card",
    ".notification-card",
    ".timeline-item",
    ".comment-card",
    ".issues-empty-state",
    "#activeFilterChips > .badge"
  ].join(",");

  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  // Action feedback is shared across citizen, staff, and admin write flows.
  // Text nodes are used deliberately so API messages can never inject markup.
  function ensureToastViewport() {
    if (toastViewport && toastViewport.isConnected) {
      return toastViewport;
    }
    toastViewport = document.createElement("section");
    toastViewport.className = "ocsp-toast-viewport";
    toastViewport.setAttribute("aria-label", "Action messages");
    document.body.append(toastViewport);
    return toastViewport;
  }

  function removeToast(id) {
    const record = toastRecords.get(id);
    if (!record) return;
    global.clearTimeout(record.timer);
    global.clearTimeout(record.removeTimer);
    record.node.remove();
    toastRecords.delete(id);
    if (toastKeyIndex.get(record.key) === id) toastKeyIndex.delete(record.key);
    if (toastViewport && !toastViewport.childElementCount) {
      toastViewport.remove();
      toastViewport = null;
    }
  }

  function dismissToast(id, immediate) {
    const record = toastRecords.get(id);
    if (!record) return;
    global.clearTimeout(record.timer);
    record.timer = null;
    if (immediate || prefersReducedMotion()) {
      removeToast(id);
      return;
    }
    if (record.removeTimer) return;
    record.node.classList.remove("is-visible");
    record.node.classList.add("is-leaving");
    record.removeTimer = global.setTimeout(() => removeToast(id), 260);
  }

  function scheduleToast(record) {
    if (!record || record.remaining <= 0 || record.timer || record.removeTimer) return;
    record.startedAt = global.performance.now();
    record.timer = global.setTimeout(() => dismissToast(record.id), record.remaining);
  }

  function pauseToast(record) {
    if (!record || !record.timer) return;
    global.clearTimeout(record.timer);
    record.timer = null;
    record.remaining = Math.max(
      0,
      record.remaining - (global.performance.now() - record.startedAt)
    );
  }

  function showToast(message, options) {
    const text = String(message || "").trim();
    if (!text) return null;

    const requested = options || {};
    const tone = Object.prototype.hasOwnProperty.call(TOAST_TONES, requested.tone)
      ? requested.tone
      : "info";
    const definition = TOAST_TONES[tone];
    const durationValue = Number(requested.duration);
    const duration = Number.isFinite(durationValue)
      ? Math.max(0, durationValue)
      : definition.duration;
    const titleText = String(requested.title || definition.title);
    // Tone and title are part of the key so a later failure can never reuse
    // the visual treatment or semantics of an earlier success.
    const key = tone + ":" + titleText + ":" + String(requested.key || text);
    const existing = toastRecords.get(toastKeyIndex.get(key));

    if (existing) {
      pauseToast(existing);
      global.clearTimeout(existing.removeTimer);
      existing.removeTimer = null;
      existing.remaining = duration;
      existing.message.textContent = text;
      existing.node.classList.remove("is-leaving");
      existing.node.classList.add("is-visible");
      // Refreshed messages become newest so capacity eviction remains fair.
      toastRecords.delete(existing.id);
      toastRecords.set(existing.id, existing);
      if (!existing.hovered && !existing.focused) scheduleToast(existing);
      return existing.id;
    }

    while (toastRecords.size >= 3) {
      const removable = Array.from(toastRecords.values()).find(
        (record) => !record.hovered && !record.focused
      ) || toastRecords.values().next().value;
      removeToast(removable.id);
    }

    const id = ++toastSequence;
    const node = document.createElement("article");
    node.className = "ocsp-toast ocsp-toast--" + tone;
    if (requested.announce !== false) {
      node.setAttribute("role", tone === "danger" ? "alert" : "status");
    }

    const icon = document.createElement("i");
    icon.className = "bi " + definition.icon + " ocsp-toast__icon";
    icon.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "ocsp-toast__content";
    const title = document.createElement("strong");
    title.className = "ocsp-toast__title";
    title.textContent = titleText;
    const messageElement = document.createElement("p");
    messageElement.className = "ocsp-toast__message";
    messageElement.textContent = text;
    content.append(title, messageElement);

    const closeButton = document.createElement("button");
    closeButton.className = "ocsp-toast__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Dismiss message");
    const closeIcon = document.createElement("i");
    closeIcon.className = "bi bi-x-lg";
    closeIcon.setAttribute("aria-hidden", "true");
    closeButton.append(closeIcon);
    node.append(icon, content, closeButton);

    const record = {
      id,
      key,
      node,
      message: messageElement,
      remaining: duration,
      startedAt: 0,
      timer: null,
      removeTimer: null,
      hovered: false,
      focused: false
    };
    toastRecords.set(id, record);
    toastKeyIndex.set(key, id);

    closeButton.addEventListener("click", () => dismissToast(id));
    node.addEventListener("mouseenter", () => {
      record.hovered = true;
      pauseToast(record);
    });
    node.addEventListener("mouseleave", () => {
      record.hovered = false;
      if (!record.focused) scheduleToast(record);
    });
    node.addEventListener("focusin", () => {
      record.focused = true;
      pauseToast(record);
    });
    node.addEventListener("focusout", (event) => {
      if (!node.contains(event.relatedTarget)) {
        record.focused = false;
        if (!record.hovered) scheduleToast(record);
      }
    });

    ensureToastViewport().append(node);
    global.requestAnimationFrame(() => node.classList.add("is-visible"));
    scheduleToast(record);
    return id;
  }

  function toastWithTone(tone, message, options) {
    return showToast(message, Object.assign({}, options || {}, { tone }));
  }

  function clearToasts() {
    Array.from(toastRecords.keys()).forEach((id) => removeToast(id));
  }

  function elementsWithin(root, selector) {
    if (!root || !selector) {
      return [];
    }

    const elements = [];
    if (root.nodeType === 1 && root.matches(selector)) {
      elements.push(root);
    }
    if (typeof root.querySelectorAll === "function") {
      elements.push(...root.querySelectorAll(selector));
    }
    return elements;
  }

  function finishReveal(element) {
    if (revealObserver) {
      revealObserver.unobserve(element);
    }
    pendingRevealElements.delete(element);
    element.classList.remove("ocsp-motion-enter", "is-visible");
    element.style.removeProperty("--ocsp-motion-delay");
    element.style.removeProperty("--ocsp-motion-distance");
    element.style.removeProperty("--ocsp-motion-duration");
    element.dataset.ocspMotionComplete = "true";
  }

  function showReveal(element) {
    if (!element || element.dataset.ocspMotionComplete === "true") {
      return;
    }

    if (prefersReducedMotion()) {
      finishReveal(element);
      return;
    }

    global.requestAnimationFrame(() => {
      element.classList.add("is-visible");
      let cleanupTimer = null;
      const cleanup = (event) => {
        if (event && !["opacity", "translate"].includes(event.propertyName)) {
          return;
        }
        global.clearTimeout(cleanupTimer);
        element.removeEventListener("transitionend", cleanup);
        finishReveal(element);
      };
      element.addEventListener("transitionend", cleanup);
      const duration = Number.parseFloat(
        element.style.getPropertyValue("--ocsp-motion-duration")
      ) || 240;
      const delay = Number.parseFloat(
        element.style.getPropertyValue("--ocsp-motion-delay")
      ) || 0;
      cleanupTimer = global.setTimeout(() => cleanup(), duration + delay + 100);
    });
  }

  function getRevealObserver() {
    if (revealObserver || !("IntersectionObserver" in global)) {
      return revealObserver;
    }

    revealObserver = new global.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        revealObserver.unobserve(entry.target);
        showReveal(entry.target);
      });
    }, {
      rootMargin: "0px 0px -6% 0px",
      threshold: 0.08
    });
    return revealObserver;
  }

  // List filters can replace cards before they enter the viewport. Stop observing
  // those detached nodes so repeated renders do not retain unused elements.
  function cleanupDisconnectedReveals() {
    pendingRevealElements.forEach((element) => {
      if (!element.isConnected) {
        finishReveal(element);
      }
    });
  }

  // Reveal only newly rendered elements. Completed nodes are intentionally skipped.
  function revealList(container, selector, options) {
    cleanupDisconnectedReveals();
    const settings = Object.assign({
      stagger: true,
      interval: 36,
      duration: 240,
      distance: 10,
      maximumDelay: 120
    }, options || {});
    const elements = elementsWithin(container, selector)
      .filter((element) => element.dataset.ocspMotionInitialized !== "true");

    elements.forEach((element, index) => {
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

  function revealWithin(root, options) {
    const settings = options || {};
    revealList(root, STATIC_REVEAL_SELECTOR, {
      stagger: settings.stagger !== false,
      interval: settings.interval || 36,
      duration: settings.duration || 260,
      distance: settings.distance || 12,
      maximumDelay: 140
    });
    revealList(root, CONTENT_REVEAL_SELECTOR, {
      stagger: settings.stagger !== false,
      interval: settings.interval || 28,
      duration: settings.duration || 220,
      distance: settings.distance || 8,
      maximumDelay: 100
    });
  }

  function numericValue(value) {
    const number = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(number) ? number : null;
  }

  function visibleNumberFromText(value) {
    const match = String(value || "").match(/-?\d[\d,]*/);
    return match ? numericValue(match[0]) : null;
  }

  // Animate a counter without changing its surrounding label or layout.
  function countTo(element, targetValue, options) {
    if (!element) {
      return;
    }

    const target = Number(targetValue);
    if (!Number.isFinite(target)) {
      return;
    }

    const settings = Object.assign({
      duration: 520,
      startValue: null,
      minimumDigits: 1,
      useGrouping: false,
      prefix: "",
      suffix: "",
      format: null
    }, options || {});
    const formatter = typeof settings.format === "function"
      ? settings.format
      : (value) => `${settings.prefix}${Math.round(value).toLocaleString("en-US", {
        minimumIntegerDigits: settings.minimumDigits,
        useGrouping: settings.useGrouping
      })}${settings.suffix}`;
    const current = settings.startValue === null
      ? visibleNumberFromText(element.textContent)
      : Number(settings.startValue);
    const start = Number.isFinite(current) ? current : 0;
    const previousFrame = counterFrames.get(element);
    if (previousFrame) {
      global.cancelAnimationFrame(previousFrame);
      counterFrames.delete(element);
    }

    if (prefersReducedMotion() || settings.duration <= 0 || start === target) {
      element.textContent = formatter(target);
      return;
    }

    const startedAt = global.performance.now();
    const step = (now) => {
      const progress = Math.min((now - startedAt) / settings.duration, 1);
      // Ease-out quadratic moves quickly at first and preserves visible steps
      // near the target, which reads more cleanly for small dashboard counts.
      const eased = 1 - Math.pow(1 - progress, 2);
      const value = start + ((target - start) * eased);
      const nextText = formatter(value);
      if (element.textContent !== nextText) {
        element.textContent = nextText;
      }

      if (progress < 1) {
        counterFrames.set(element, global.requestAnimationFrame(step));
      } else {
        element.textContent = formatter(target);
        counterFrames.delete(element);
      }
    };
    counterFrames.set(element, global.requestAnimationFrame(step));
  }

  function parseCounterText(element) {
    const text = String(element.textContent || "").trim();
    const match = text.match(/-?\d[\d,]*/);
    if (!match) {
      return null;
    }

    const target = numericValue(match[0]);
    if (target === null) {
      return null;
    }
    const startIndex = match.index || 0;
    return {
      target,
      prefix: text.slice(0, startIndex),
      suffix: text.slice(startIndex + match[0].length),
      useGrouping: match[0].includes(","),
      finalText: text
    };
  }

  function getCounterObserver() {
    if (counterObserver || !("IntersectionObserver" in global)) {
      return counterObserver;
    }

    counterObserver = new global.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        counterObserver.unobserve(entry.target);
        const data = staticCounterData.get(entry.target);
        if (!data) {
          return;
        }
        countTo(entry.target, data.target, {
          startValue: 0,
          useGrouping: data.useGrouping,
          format: (value) => `${data.prefix}${Math.round(value).toLocaleString("en-US", {
            useGrouping: data.useGrouping
          })}${data.suffix}`
        });
      });
    }, { threshold: 0.45 });
    return counterObserver;
  }

  function initializeStaticCounters(root) {
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

  // Replays a short pulse only when the represented value actually changes.
  function pulse(element, value) {
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
    void element.offsetWidth;
    element.classList.add("ocsp-notification-pulse");
    element.addEventListener("animationend", () => {
      element.classList.remove("ocsp-notification-pulse");
    }, { once: true });
  }

  function revealStatus(element) {
    if (!element || element.hidden || element.classList.contains("d-none") || prefersReducedMotion()) {
      return;
    }
    element.classList.remove("ocsp-status-enter");
    void element.offsetWidth;
    element.classList.add("ocsp-status-enter");
    element.addEventListener("animationend", () => {
      element.classList.remove("ocsp-status-enter");
    }, { once: true });
  }

  // The original button markup is restored exactly after each async request.
  function setButtonBusy(button, isBusy, loadingLabel) {
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

  function skeletonBlock(className) {
    const block = document.createElement("span");
    block.className = `ocsp-skeleton__block ${className}`;
    return block;
  }

  function removeSkeletonAnnouncement(container) {
    const announcement = skeletonAnnouncements.get(container);
    if (!announcement) {
      return;
    }
    announcement.observer.disconnect();
    announcement.status.remove();
    skeletonAnnouncements.delete(container);
  }

  // Skeletons reserve the final card space and prevent a blank layout during API calls.
  function renderSkeletons(container, options) {
    if (!container) {
      return;
    }
    const settings = Object.assign({
      count: 3,
      variant: "issue",
      label: "Loading content..."
    }, options || {});
    removeSkeletonAnnouncement(container);
    container.setAttribute("aria-busy", "true");

    // Keep the live status outside the busy region so assistive technology can
    // announce it immediately. It removes itself when the page clears aria-busy.
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
    global.requestAnimationFrame(() => {
      if (status.isConnected) {
        status.textContent = settings.label;
      }
    });

    const fragment = document.createDocumentFragment();
    const list = document.createElement("div");
    list.className = `ocsp-skeleton-list ocsp-skeleton-list--${settings.variant}`;
    list.setAttribute("aria-hidden", "true");

    for (let index = 0; index < settings.count; index += 1) {
      const card = document.createElement("article");
      card.className = `ocsp-skeleton-card ocsp-skeleton-card--${settings.variant}`;

      if (settings.variant === "notification") {
        card.append(skeletonBlock("ocsp-skeleton__avatar"));
      } else {
        card.append(skeletonBlock("ocsp-skeleton__media"));
      }

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

    fragment.append(list);
    container.replaceChildren(fragment);
  }

  function initializePage() {
    if (pageInitialized) {
      return;
    }
    pageInitialized = true;
    revealWithin(document);
    initializeStaticCounters(document);

    // Bootstrap emits this event for the citizen dialogs. Hash dialogs use CSS motion.
    document.addEventListener("shown.bs.modal", (event) => {
      revealWithin(event.target, { stagger: true, interval: 45, distance: 8 });
    });
  }

  document.documentElement.classList.add("ocsp-motion-enabled");
  ocsp.feedback = Object.freeze({
    show: showToast,
    success: (message, options) => toastWithTone("success", message, options),
    error: (message, options) => toastWithTone("danger", message, options),
    warning: (message, options) => toastWithTone("warning", message, options),
    info: (message, options) => toastWithTone("info", message, options),
    dismiss: dismissToast,
    clear: clearToasts
  });
  ocsp.animations = Object.freeze({
    countTo,
    initializePage,
    pulse,
    prefersReducedMotion,
    renderSkeletons,
    revealList,
    revealStatus,
    revealWithin,
    setButtonBusy
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage, { once: true });
  } else {
    initializePage();
  }
})(window);
