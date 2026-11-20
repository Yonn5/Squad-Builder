import type { Bitmap } from "../logic/segment";
import { base64ToBytes } from "./binary";

/**
 * Person cut-out with Google's MediaPipe selfie segmentation model
 * (Apache 2.0). The model is a neural network, so unlike the colour-based
 * fill in logic/segment.ts it recognises a person against a busy room, a
 * dark backdrop or clothes the colour of the wall.
 *
 * It runs in a browser engine: the page itself on the web, and a hidden
 * WebView on phones (Expo Go ships react-native-webview, so no custom
 * build is needed). The engine (~9 MB) and the model (~250 KB) are fetched
 * from these addresses the first time and cached by the browser engine
 * after that. Versions are pinned so an upstream release cannot change
 * what the app runs.
 */
export const VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

/** First use downloads the engine; on a slow connection that takes a while. */
export const LOAD_TIMEOUT_MS = 60_000;
/** Once loaded, a photo takes well under a second; this is a safety net. */
export const RUN_TIMEOUT_MS = 20_000;

export type PersonSegmenter = {
  /** Starts the download early, so it is ready by the time it is needed. */
  warm(): void;
  /**
   * Opacity of the person at every pixel, 0..255, the same size as the
   * bitmap. Rejects when the model cannot be loaded or run (no internet).
   */
  segment(bitmap: Bitmap): Promise<Uint8Array>;
};

/**
 * Runs inside the browser engine. Defines `load()` and `segment(dataUrl)`,
 * which returns `{ width, height, mask }` with the mask as base64 bytes.
 */
export const SEGMENTER_SCRIPT = `
const VISION_URL = ${JSON.stringify(VISION_URL)};
const MODEL_URL = ${JSON.stringify(MODEL_URL)};
let loading = null;
let attempts = 0;
function load() {
  if (!loading) {
    // Browsers remember a failed module download and will not fetch it
    // again, so a retry asks for it under a fresh address.
    const retry = attempts++ ? "?retry=" + attempts : "";
    loading = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import(VISION_URL + "/vision_bundle.mjs" + retry);
      const fileset = await FilesetResolver.forVisionTasks(VISION_URL + "/wasm");
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    })();
    // A failed download (no signal) can be retried on the next tap.
    loading.catch(() => { loading = null; });
  }
  return loading;
}
async function segment(dataUrl) {
  const segmenter = await load();
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  const result = segmenter.segment(canvas);
  const confidence = result.confidenceMasks[0].getAsFloat32Array();
  const mask = new Uint8Array(confidence.length);
  // Sharpen the model's soft confidence into a clean edge with a short ramp.
  for (let i = 0; i < confidence.length; i++) {
    const v = (confidence[i] - 0.3) / 0.4;
    mask[i] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
  }
  if (result.close) result.close();
  let binary = "";
  for (let i = 0; i < mask.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, mask.subarray(i, i + 0x8000));
  }
  return { width: canvas.width, height: canvas.height, mask: btoa(binary) };
}
`;

/** The page loaded into the phone's hidden WebView. */
export const SEGMENTER_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script type="module">
${SEGMENTER_SCRIPT}
const post = (message) => window.ReactNativeWebView.postMessage(JSON.stringify(message));
window.squadWarm = () => {
  load().then(() => post({ type: "ready" }), (e) => post({ type: "failed", error: String((e && e.message) || e) }));
};
window.squadRun = async (id, dataUrl) => {
  try {
    post({ type: "result", id, ok: true, ...(await segment(dataUrl)) });
  } catch (e) {
    post({ type: "result", id, ok: false, error: String((e && e.message) || e) });
  }
};
post({ type: "page" });
</script>
</body></html>`;

/** Unpacks what the script returned, checking it matches the photo. */
export function maskFromResult(
  result: { width: number; height: number; mask: string },
  bitmap: Bitmap,
): Uint8Array {
  const mask = base64ToBytes(result.mask);
  if (
    result.width !== bitmap.width ||
    result.height !== bitmap.height ||
    mask.length !== bitmap.width * bitmap.height
  ) {
    throw new Error("cut-out size does not match the photo");
  }
  return mask;
}

/** Rejects with `label` if `work` has not settled after `ms`. */
export function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
