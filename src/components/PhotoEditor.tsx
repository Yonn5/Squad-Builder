import Slider from "@react-native-community/slider";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  CARD_SIZE,
  EDIT_SIZE,
  encodeBitmap,
  loadPixels,
  type PhotoData,
} from "../lib/photo";
import {
  applyMask,
  cropBitmap,
  paintStrokes,
  scaleBitmap,
  scaleMask,
  type Point,
  type Rect,
  type Stroke,
} from "../logic/mask";
import { subjectMask, type Bitmap } from "../logic/segment";
import { colors } from "../theme";
import { Button } from "./ui";

/** Longest side of the image regenerated after each brush stroke. */
const PREVIEW_SIZE = 340;
/** How close a finger must land to a corner to grab it, in screen points. */
const HANDLE_GRAB = 34;
/** Smallest crop, as a share of the photo's shorter side. */
const MIN_CROP = 0.15;
/** Gap around the photo, so corner handles never sit half off the screen. */
const INSET = 26;

type Mode = "crop" | "erase" | "restore";
type Drag = { kind: "move" | "nw" | "ne" | "sw" | "se"; from: Rect; at: Point };

type Geometry = { scale: number; left: number; top: number };

/** Everything the editor needs to pick up exactly where it left off. */
export type EditSession = {
  crop: Rect;
  strokes: Stroke[];
  autoAlpha: Uint8Array | null;
};

/**
 * Full-screen photo editor: drag the frame to crop, and rub the background
 * away with a finger. The automatic cut-out is offered here as a starting
 * point, because where it gets a photo wrong the brush is what fixes it.
 *
 * Everything is worked out on a copy at {@link EDIT_SIZE} so the brush stays
 * responsive; on Done the mask is scaled up and re-applied at full size.
 */
export function PhotoEditor({
  visible,
  source,
  session,
  onCancel,
  onDone,
}: {
  visible: boolean;
  source: PhotoData;
  /** Work from a previous visit to the editor, resumed rather than lost. */
  session: EditSession | null;
  onCancel: () => void;
  onDone: (photo: PhotoData, session: EditSession) => void;
}) {
  const [pixels, setPixels] = useState<Bitmap | null>(null);
  const [preview, setPreview] = useState<string>(source.uri);
  const [mode, setMode] = useState<Mode>("crop");
  const [crop, setCrop] = useState<Rect | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [autoAlpha, setAutoAlpha] = useState<Uint8Array | null>(null);
  const [autoNote, setAutoNote] = useState<string | null>(null);
  const [brush, setBrush] = useState(26);
  const [live, setLive] = useState<Point[]>([]);
  const [busy, setBusy] = useState<null | "load" | "auto" | "paint" | "save">(
    "load",
  );

  // Gesture handlers are created once, so everything they read lives in refs.
  const geometry = useRef<Geometry>({ scale: 1, left: 0, top: 0 });
  const modeRef = useRef(mode);
  const cropRef = useRef<Rect | null>(null);
  const brushRef = useRef(brush);
  const pixelsRef = useRef<Bitmap | null>(null);
  const liveRef = useRef<Point[]>([]);
  const dragRef = useRef<Drag | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const autoAlphaRef = useRef<Uint8Array | null>(null);
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  // Read from the tree outside the modal: a Modal is its own native view
  // hierarchy with no safe-area provider in it, so a SafeAreaView placed
  // inside one measures nothing and the header lands under the clock.
  const insets = useSafeAreaInsets();

  modeRef.current = mode;
  brushRef.current = brush;
  cropRef.current = crop;
  pixelsRef.current = pixels;
  strokesRef.current = strokes;
  autoAlphaRef.current = autoAlpha;

  /** Rebuilds the on-screen image from the auto mask plus every stroke. */
  const refreshPreview = useCallback(
    (nextStrokes: Stroke[], base: Uint8Array | null) => {
      const bitmap = pixelsRef.current;
      if (!bitmap) return;
      if (nextStrokes.length === 0 && !base) {
        setPreview(source.uri);
        return;
      }
      const mask = new Uint8Array(bitmap.width * bitmap.height);
      paintStrokes(
        mask,
        bitmap.width,
        bitmap.height,
        nextStrokes,
        base ?? undefined,
      );
      const small = scaleBitmap(applyMask(bitmap, mask), PREVIEW_SIZE);
      setPreview(encodeBitmap(small, true).uri);
    },
    [source.uri],
  );

  // Load the photo's pixels once the editor opens.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setBusy("load");
    setPreview(source.uri);
    strokesRef.current = session?.strokes ?? [];
    setStrokes(strokesRef.current);
    autoAlphaRef.current = session?.autoAlpha ?? null;
    setAutoAlpha(autoAlphaRef.current);
    setAutoNote(null);
    setMode("crop");
    loadPixels(source.uri, EDIT_SIZE)
      .then((bitmap) => {
        if (cancelled) return;
        setPixels(bitmap);
        pixelsRef.current = bitmap;
        setCrop(
          session?.crop ?? {
            x: 0,
            y: 0,
            width: bitmap.width,
            height: bitmap.height,
          },
        );
        setBrush(Math.round(Math.min(bitmap.width, bitmap.height) / 12));
        setBusy(null);
        if (session) refreshPreview(strokesRef.current, autoAlphaRef.current);
      })
      .catch(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
    // `session` is deliberately not a dependency: it is read once, when the
    // editor opens, and reloading on every change to it would undo the work.
  }, [visible, source.uri, refreshPreview]);

  /** Runs work that blocks the thread after the spinner has had a frame. */
  const withSpinner = (kind: "auto" | "paint" | "save", work: () => void) => {
    setBusy(kind);
    setTimeout(() => {
      try {
        work();
      } finally {
        setBusy(null);
      }
    }, 16);
  };

  const toImage = (x: number, y: number): Point => {
    const { scale, left, top } = geometry.current;
    return { x: (x - left) / scale, y: (y - top) / scale };
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        const at = toImage(locationX, locationY);
        if (modeRef.current === "crop") {
          const rect = cropRef.current;
          if (!rect) return;
          dragRef.current = { kind: cornerAt(at, rect), from: rect, at };
          return;
        }
        liveRef.current = [at];
        setLive([at]);
      },

      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        const at = toImage(locationX, locationY);
        const bitmap = pixelsRef.current;
        if (!bitmap) return;

        if (modeRef.current === "crop") {
          const drag = dragRef.current;
          if (!drag) return;
          setCrop(resize(drag, at, bitmap.width, bitmap.height));
          return;
        }
        liveRef.current = [...liveRef.current, at];
        setLive(liveRef.current);
      },

      // Nothing may take the gesture away mid-stroke, and if something
      // does, the half-drawn stroke is dropped rather than left on screen.
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        dragRef.current = null;
        liveRef.current = [];
        setLive([]);
      },

      onPanResponderRelease: () => {
        if (modeRef.current === "crop") {
          dragRef.current = null;
          return;
        }
        const points = liveRef.current;
        liveRef.current = [];
        setLive([]);
        if (points.length === 0) return;

        const next = [
          ...strokesRef.current,
          {
            points,
            radius: brushRef.current,
            erase: modeRef.current === "erase",
          },
        ];
        strokesRef.current = next;
        setStrokes(next);
        withSpinner("paint", () => refreshPreview(next, autoAlphaRef.current));
      },
    }),
  ).current;

  const removeBackground = () => {
    const bitmap = pixels;
    if (!bitmap) return;
    withSpinner("auto", () => {
      const result = subjectMask(bitmap);
      autoAlphaRef.current = result.alpha;
      setAutoAlpha(result.alpha);
      setAutoNote(
        result.dominance > 0.85 && result.coverage > 0.04
          ? null
          : "That came out in pieces — the background is close in colour to what the player is wearing. Use Restore to paint back what it took, or Reset and brush it by hand.",
      );
      refreshPreview(strokes, result.alpha);
      setMode("restore");
    });
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const next = strokes.slice(0, -1);
    strokesRef.current = next;
    setStrokes(next);
    withSpinner("paint", () => refreshPreview(next, autoAlphaRef.current));
  };

  const reset = () => {
    strokesRef.current = [];
    setStrokes([]);
    autoAlphaRef.current = null;
    setAutoAlpha(null);
    setAutoNote(null);
    if (pixels) setCrop({ x: 0, y: 0, width: pixels.width, height: pixels.height });
    setPreview(source.uri);
  };

  const done = async () => {
    const editing = pixels;
    const rect = crop;
    if (!editing || !rect) return;
    setBusy("save");
    try {
      // Redo the work at full size so the saved photo is not the editor's
      // downscaled working copy.
      const full = await loadPixels(source.uri, CARD_SIZE);
      const ratio = full.width / editing.width;

      const mask = new Uint8Array(editing.width * editing.height);
      paintStrokes(
        mask,
        editing.width,
        editing.height,
        strokes,
        autoAlpha ?? undefined,
      );
      const scaled = scaleMask(
        mask,
        editing.width,
        editing.height,
        full.width,
        full.height,
      );
      const cropped = cropBitmap(applyMask(full, scaled), {
        x: rect.x * ratio,
        y: rect.y * ratio,
        width: rect.width * ratio,
        height: rect.height * ratio,
      });
      onDone(encodeBitmap(cropped), { crop: rect, strokes, autoAlpha });
    } finally {
      setBusy(null);
    }
  };

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvas({ width, height });
  };

  if (pixels && canvas.width > 0) {
    const scale = Math.min(
      (canvas.width - INSET * 2) / pixels.width,
      (canvas.height - INSET * 2) / pixels.height,
    );
    geometry.current = {
      scale,
      left: (canvas.width - pixels.width * scale) / 2,
      top: (canvas.height - pixels.height * scale) / 2,
    };
  }
  const { scale, left, top } = geometry.current;
  const frame = crop
    ? {
        left: left + crop.x * scale,
        top: top + crop.y * scale,
        width: crop.width * scale,
        height: crop.height * scale,
      }
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.header}>
          <TouchableOpacity
            testID="editor-cancel"
            onPress={onCancel}
            disabled={busy === "save"}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Photo</Text>
          <TouchableOpacity
            testID="editor-done"
            onPress={done}
            disabled={!pixels || busy !== null}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text
              style={[
                styles.headerAction,
                styles.headerDone,
                (!pixels || busy !== null) && styles.headerDisabled,
              ]}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.canvas}
          onLayout={onCanvasLayout}
          {...responder.panHandlers}
        >
          {pixels && frame ? (
            <>
              {/* The preview is swapped for a new one after every stroke, so
                  it must never be the touch target: the gesture would die
                  along with the element it started on. */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: pixels.width * scale,
                  height: pixels.height * scale,
                }}
              >
                <Image
                  source={{ uri: preview }}
                  style={styles.fill}
                  resizeMode="stretch"
                />
              </View>

              {/* Everything outside the frame, dimmed. */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[styles.shade, { left: 0, right: 0, top: 0, height: frame.top }]} />
                <View
                  style={[
                    styles.shade,
                    { left: 0, right: 0, top: frame.top + frame.height, bottom: 0 },
                  ]}
                />
                <View
                  style={[
                    styles.shade,
                    { left: 0, width: frame.left, top: frame.top, height: frame.height },
                  ]}
                />
                <View
                  style={[
                    styles.shade,
                    {
                      left: frame.left + frame.width,
                      right: 0,
                      top: frame.top,
                      height: frame.height,
                    },
                  ]}
                />
                <View style={[styles.frame, frame]} />
                {mode === "crop" &&
                  ([
                    { left: frame.left, top: frame.top },
                    { left: frame.left + frame.width, top: frame.top },
                    { left: frame.left, top: frame.top + frame.height },
                    { left: frame.left + frame.width, top: frame.top + frame.height },
                  ] as const).map((corner, index) => (
                    <View
                    key={index}
                    testID={`editor-handle-${index}`}
                    style={[styles.handle, corner]}
                  />
                  ))}
              </View>

              {/* The stroke under the finger right now. */}
              {live.length > 0 && (
                <Svg
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: pixels.width * scale,
                    height: pixels.height * scale,
                  }}
                  width={pixels.width * scale}
                  height={pixels.height * scale}
                >
                  <Path
                    d={live
                      .map(
                        (p, i) =>
                          `${i === 0 ? "M" : "L"}${p.x * scale} ${p.y * scale}`,
                      )
                      .join(" ")}
                    stroke={mode === "erase" ? colors.danger : colors.accent}
                    strokeOpacity={0.55}
                    strokeWidth={brush * 2 * scale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              )}
            </>
          ) : null}

          {busy !== null && (
            <View pointerEvents="none" style={styles.busy}>
              <ActivityIndicator color={colors.accent} size="large" />
              {busy === "save" ? <Text style={styles.busyText}>Saving…</Text> : null}
            </View>
          )}
        </View>

        <View
          style={[
            styles.controls,
            { paddingBottom: 16 + insets.bottom },
          ]}
        >
          <View style={styles.modes}>
            {(["crop", "erase", "restore"] as Mode[]).map((option) => (
              <TouchableOpacity
                key={option}
                testID={`editor-mode-${option}`}
                onPress={() => setMode(option)}
                style={[styles.modeChip, mode === option && styles.modeChipOn]}
              >
                <Text
                  style={[styles.modeText, mode === option && styles.modeTextOn]}
                >
                  {option === "crop"
                    ? "Crop"
                    : option === "erase"
                      ? "Erase"
                      : "Restore"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === "crop" ? (
            <Text style={styles.hint}>
              Drag inside the frame to move it, or drag a corner to resize.
              Everything shaded is cut away.
            </Text>
          ) : (
            <>
              <View style={styles.brushRow}>
                <Text style={styles.brushLabel}>Brush</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={6}
                  maximumValue={Math.max(
                    40,
                    Math.round(
                      Math.min(pixels?.width ?? 200, pixels?.height ?? 200) / 4,
                    ),
                  )}
                  value={brush}
                  onValueChange={(value) => setBrush(Math.round(value))}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.accent}
                />
              </View>
              <Text style={styles.hint}>
                {mode === "erase"
                  ? "Rub over the background to take it away."
                  : "Paint back anything that was taken away by mistake."}
              </Text>
            </>
          )}

          {autoNote ? <Text style={styles.note}>{autoNote}</Text> : null}

          <Button
            title="Remove Background"
            onPress={removeBackground}
            variant="secondary"
            disabled={!pixels || busy !== null}
            testID="editor-auto"
          />
          <View style={styles.actions}>
            <Button
              title="Undo"
              onPress={undo}
              variant="secondary"
              disabled={strokes.length === 0 || busy !== null}
              style={styles.action}
              testID="editor-undo"
            />
            <Button
              title="Reset"
              onPress={reset}
              variant="secondary"
              disabled={busy !== null}
              style={styles.action}
              testID="editor-reset"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Which corner, if any, the finger landed on. */
function cornerAt(at: Point, rect: Rect): Drag["kind"] {
  const near = (x: number, y: number) =>
    Math.abs(at.x - x) < HANDLE_GRAB && Math.abs(at.y - y) < HANDLE_GRAB;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  if (near(rect.x, rect.y)) return "nw";
  if (near(right, rect.y)) return "ne";
  if (near(rect.x, bottom)) return "sw";
  if (near(right, bottom)) return "se";
  return "move";
}

/** Applies a drag to the crop frame, kept inside the photo. */
function resize(drag: Drag, at: Point, width: number, height: number): Rect {
  const dx = at.x - drag.at.x;
  const dy = at.y - drag.at.y;
  const { from, kind } = drag;
  const minimum = Math.min(width, height) * MIN_CROP;

  if (kind === "move") {
    return {
      x: Math.max(0, Math.min(width - from.width, from.x + dx)),
      y: Math.max(0, Math.min(height - from.height, from.y + dy)),
      width: from.width,
      height: from.height,
    };
  }

  let x0 = from.x;
  let y0 = from.y;
  let x1 = from.x + from.width;
  let y1 = from.y + from.height;

  if (kind === "nw" || kind === "sw") x0 = Math.min(x1 - minimum, Math.max(0, x0 + dx));
  else x1 = Math.max(x0 + minimum, Math.min(width, x1 + dx));
  if (kind === "nw" || kind === "ne") y0 = Math.min(y1 - minimum, Math.max(0, y0 + dy));
  else y1 = Math.max(y0 + minimum, Math.min(height, y1 + dy));

  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  headerAction: { color: colors.textMuted, fontSize: 16, fontWeight: "700" },
  headerDone: { color: colors.accent },
  headerDisabled: { opacity: 0.4 },
  // Erased areas show this through, so it must not read as part of a photo.
  canvas: { flex: 1, backgroundColor: "#4a5160", overflow: "hidden" },
  fill: { width: "100%", height: "100%" },
  shade: { position: "absolute", backgroundColor: "rgba(10,12,16,0.62)" },
  frame: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.accent,
  },
  handle: {
    position: "absolute",
    width: 22,
    height: 22,
    marginLeft: -11,
    marginTop: -11,
    borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: "#08351d",
  },
  busy: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,17,22,0.55)",
    gap: 10,
  },
  busyText: { color: colors.text, fontWeight: "700" },
  controls: { padding: 16, gap: 10 },
  modes: { flexDirection: "row", gap: 8 },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  modeChipOn: { borderColor: colors.accent, backgroundColor: "#12291c" },
  modeText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
  modeTextOn: { color: colors.accent },
  brushRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brushLabel: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  slider: { flex: 1, height: 36 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  note: { color: colors.warning, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, paddingHorizontal: 4 },
});
