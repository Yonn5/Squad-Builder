import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from "react-native-webview";
import { encodeBitmap } from "../lib/photo";
import {
  LOAD_TIMEOUT_MS,
  maskFromResult,
  RUN_TIMEOUT_MS,
  SEGMENTER_PAGE,
  withTimeout,
  type PersonSegmenter,
} from "../lib/personSegmenter";
import type { Bitmap } from "../logic/segment";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.catch(() => {}); // a rejection nobody waited for is not an error
  return { promise, resolve, reject };
}

type Result = { width: number; height: number; mask: string };

// react-native-webview's class typings do not line up with React 19's
// JSX types yet; the component itself is fine.
const HiddenWebView = WebView as unknown as React.ComponentType<
  WebViewProps & { ref?: React.Ref<WebView> }
>;

/**
 * A hidden WebView that runs the MediaPipe person cut-out (see
 * lib/personSegmenter.ts). Mount it while the photo editor is open; the
 * parent talks to it through the ref.
 */
export const PersonSegmenterHost = forwardRef<PersonSegmenter>(
  function PersonSegmenterHost(_props, ref) {
    const webview = useRef<WebView>(null);
    // Settles once the page's script is running and can take commands.
    const page = useRef(deferred<void>());
    // Settles once the engine and model have downloaded and started.
    const ready = useRef<Deferred<void> | null>(null);
    const pending = useRef(new Map<string, Deferred<Result>>());
    const nextId = useRef(0);

    const run = (code: string) =>
      page.current.promise.then(() =>
        webview.current?.injectJavaScript(`${code}; true;`),
      );

    const warm = () => {
      if (!ready.current) {
        const attempt = deferred<void>();
        ready.current = attempt;
        // A failed download is forgotten, so the next tap tries again.
        attempt.promise.catch(() => {
          if (ready.current === attempt) ready.current = null;
        });
        run("window.squadWarm()");
      }
      return ready.current.promise;
    };

    /** The WebView's page died or reloaded: start over, failing what was waiting. */
    const restart = (reason: string) => {
      page.current = deferred<void>();
      ready.current?.reject(new Error(reason));
      ready.current = null;
      for (const job of pending.current.values()) job.reject(new Error(reason));
      pending.current.clear();
    };

    useImperativeHandle(ref, () => ({
      warm: () => {
        warm();
      },
      segment: async (bitmap: Bitmap) => {
        await withTimeout(warm(), LOAD_TIMEOUT_MS, "cut-out tool did not load");
        const id = String(++nextId.current);
        const job = deferred<Result>();
        pending.current.set(id, job);
        try {
          const png = encodeBitmap(bitmap, true).uri;
          run(`window.squadRun(${JSON.stringify(id)}, ${JSON.stringify(png)})`);
          const result = await withTimeout(
            job.promise,
            RUN_TIMEOUT_MS,
            "cut-out took too long",
          );
          return maskFromResult(result, bitmap);
        } finally {
          pending.current.delete(id);
        }
      },
    }));

    useEffect(() => () => restart("editor closed"), []);

    const onMessage = (event: WebViewMessageEvent) => {
      let message: {
        type?: string;
        id?: string;
        ok?: boolean;
        error?: string;
      } & Partial<Result>;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (message.type === "page") page.current.resolve();
      else if (message.type === "ready") ready.current?.resolve();
      else if (message.type === "failed")
        ready.current?.reject(new Error(message.error ?? "load failed"));
      else if (message.type === "result" && message.id) {
        const job = pending.current.get(message.id);
        if (!job) return;
        if (message.ok && typeof message.mask === "string")
          job.resolve(message as Result);
        else job.reject(new Error(message.error ?? "cut-out failed"));
      }
    };

    return (
      <View pointerEvents="none" style={styles.hidden}>
        <HiddenWebView
          ref={webview}
          source={{ html: SEGMENTER_PAGE, baseUrl: "https://cdn.jsdelivr.net/" }}
          originWhitelist={["*"]}
          javaScriptEnabled
          onMessage={onMessage}
          onContentProcessDidTerminate={() => {
            restart("page crashed");
            webview.current?.reload();
          }}
          onRenderProcessGone={() => {
            restart("page crashed");
            webview.current?.reload();
          }}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // Off screen but laid out: some platforms pause a WebView with no size.
  hidden: {
    position: "absolute",
    left: -10,
    top: -10,
    width: 4,
    height: 4,
    opacity: 0,
  },
});
