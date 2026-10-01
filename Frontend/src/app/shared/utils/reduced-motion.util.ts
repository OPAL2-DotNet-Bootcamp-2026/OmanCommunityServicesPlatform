/** Every animation checks this first and jumps to the finished state when it is true. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Restarts a CSS animation class, removing it again when the animation ends. */
export function replayAnimation(element: HTMLElement, className: string): void {
  if (prefersReducedMotion()) {
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth; // forces a reflow so the animation restarts
  element.classList.add(className);
  element.addEventListener("animationend", () => element.classList.remove(className), { once: true });
}
