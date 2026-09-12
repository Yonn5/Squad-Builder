import { Platform } from "react-native";

/**
 * Expo's default web shell pins the viewport scale and sets
 * `body { overflow: hidden }`, which together make the page impossible to
 * zoom or pan in a browser. We run as a single-page app rather than with
 * static output, so the `+html.tsx` shell does not apply — patch the
 * document at runtime instead.
 *
 * No-op on native.
 */
export function applyWebViewportFixes() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1, minimum-scale=0.25, maximum-scale=5, user-scalable=yes, viewport-fit=cover",
    );
  }

  if (document.getElementById("squad-builder-web-fixes")) return;
  const style = document.createElement("style");
  style.id = "squad-builder-web-fixes";
  style.textContent = `
    /* Let the page be zoomed and panned. */
    body { overflow: auto !important; background-color: #0e1116; }
    /* The UI is laid out for a phone; centre it instead of stretching
       controls the full width of a desktop display. */
    #root {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
    }
  `;
  document.head.appendChild(style);
}
