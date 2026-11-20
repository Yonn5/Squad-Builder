import { forwardRef, useImperativeHandle } from "react";
import { encodeBitmap } from "../lib/photo";
import {
  LOAD_TIMEOUT_MS,
  maskFromResult,
  RUN_TIMEOUT_MS,
  SEGMENTER_SCRIPT,
  withTimeout,
  type PersonSegmenter,
} from "../lib/personSegmenter";
import type { Bitmap } from "../logic/segment";

type Api = {
  load: () => Promise<unknown>;
  segment: (dataUrl: string) => Promise<{ width: number; height: number; mask: string }>;
};

let api: Promise<Api> | null = null;

/**
 * On the web the page is already a browser, so the MediaPipe script (see
 * lib/personSegmenter.ts) runs right here, added once as a module script.
 */
function scriptApi(): Promise<Api> {
  if (!api) {
    api = new Promise<Api>((resolve) => {
      const w = window as unknown as { __squadSegmenter?: (a: Api) => void };
      w.__squadSegmenter = resolve;
      const el = document.createElement("script");
      el.type = "module";
      el.textContent = `${SEGMENTER_SCRIPT}\nwindow.__squadSegmenter({ load, segment });`;
      document.head.appendChild(el);
    });
  }
  return api;
}

export const PersonSegmenterHost = forwardRef<PersonSegmenter>(
  function PersonSegmenterHost(_props, ref) {
    useImperativeHandle(ref, () => ({
      warm: () => {
        scriptApi()
          .then((a) => a.load())
          .catch(() => {});
      },
      segment: async (bitmap: Bitmap) => {
        const a = await scriptApi();
        await withTimeout(a.load(), LOAD_TIMEOUT_MS, "cut-out tool did not load");
        const result = await withTimeout(
          a.segment(encodeBitmap(bitmap, true).uri),
          RUN_TIMEOUT_MS,
          "cut-out took too long",
        );
        return maskFromResult(result, bitmap);
      },
    }));
    return null;
  },
);
