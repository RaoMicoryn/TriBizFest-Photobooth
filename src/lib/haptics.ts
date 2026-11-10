"use client";

/**
 * Tiny haptic helper.
 * - Android / most Chromium browsers: Vibration API.
 * - iOS Safari (18+): no Vibration API, but toggling a hidden
 *   `<input type="checkbox" switch>` produces a light haptic tick. It must be
 *   called from a user gesture (tap handlers), which is how we use it.
 */

export type HapticKind = "tap" | "select" | "success" | "warning" | "shutter";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  select: 12,
  shutter: 18,
  success: [14, 40, 22],
  warning: [24, 50, 24],
};

let iosLabel: HTMLLabelElement | null = null;

function iosTick() {
  if (typeof document === "undefined") return;
  if (!iosLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = "__haptic_switch";
    input.tabIndex = -1;
    const hide =
      "position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none;";
    input.style.cssText = hide;
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.style.cssText = hide;
    label.setAttribute("aria-hidden", "true");
    label.appendChild(input);
    document.body.appendChild(label);
    iosLabel = label;
  }
  iosLabel.click();
}

export function haptic(kind: HapticKind = "tap"): void {
  if (typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
    iosTick();
    if (kind === "success" || kind === "warning") {
      window.setTimeout(iosTick, 90);
    }
  } catch {
    /* haptics are a nice-to-have */
  }
}
