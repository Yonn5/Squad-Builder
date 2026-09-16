import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { decode as decodeJpeg } from "jpeg-js";
import type { Bitmap } from "../logic/segment";
import { base64ToBytes, bytesToBase64 } from "./binary";
import { encodePng } from "./png";

/** Longest side kept for the photo that ends up on the card. */
export const CARD_SIZE = 700;
/** Longest side the photo editor works at. Everything it does is per-pixel
 *  in JavaScript, so this trades a little sharpness for a responsive brush. */
export const EDIT_SIZE = 560;

export const PHOTO_BUCKET = "player-photos";

export type PhotoData = {
  /**
   * A displayable URI: a cache file on iOS and Android, a data or blob URI
   * on web. Kept as whatever the platform handed back rather than always a
   * data URI, so it can be fed to the manipulator again.
   */
  uri: string;
  /** The same image as base64, for upload. */
  base64: string;
  mime: "image/jpeg" | "image/png";
};

export class PhotoError extends Error {}

/** Re-encodes an image at a sane size, and hands back its bytes. */
async function toJpeg(uri: string, maxSide: number) {
  const probe = await ImageManipulator.manipulate(uri).renderAsync();
  const longest = Math.max(probe.width, probe.height);
  const scale = longest > maxSide ? maxSide / longest : 1;

  const context = ImageManipulator.manipulate(uri);
  if (scale < 1) {
    context.resize({
      width: Math.max(1, Math.round(probe.width * scale)),
      height: Math.max(1, Math.round(probe.height * scale)),
    });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.85,
    base64: true,
  });
  if (!saved.base64) throw new PhotoError("That image could not be read.");
  return {
    uri: saved.uri,
    base64: saved.base64,
    width: rendered.width,
    height: rendered.height,
  };
}

/**
 * Opens the device photo library. Resolves to `null` when the player backs
 * out, and throws {@link PhotoError} when the library cannot be opened.
 */
export async function pickPhotoFromLibrary(): Promise<PhotoData | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoError(
      "Squad Builder needs access to your photos. Turn it on in Settings and try again.",
    );
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  const { uri, base64 } = await toJpeg(picked.assets[0].uri, CARD_SIZE);
  return { uri, base64, mime: "image/jpeg" };
}

/** Decodes a photo to raw pixels at no more than `maxSide` on its longest edge. */
export async function loadPixels(
  uri: string,
  maxSide: number,
): Promise<Bitmap> {
  const work = await toJpeg(uri, maxSide);
  const decoded = decodeJpeg(base64ToBytes(work.base64), {
    useTArray: true,
    formatAsRGBA: true,
  });
  return {
    data: decoded.data,
    width: decoded.width,
    height: decoded.height,
  };
}

/**
 * Packs raw pixels back into a PNG, keeping transparency. Pass `fast` for an
 * image that is only going to be looked at, not saved.
 */
export function encodeBitmap(bitmap: Bitmap, fast = false): PhotoData {
  const base64 = bytesToBase64(
    encodePng(bitmap.data, bitmap.width, bitmap.height, { fast }),
  );
  return {
    uri: `data:image/png;base64,${base64}`,
    base64,
    mime: "image/png",
  };
}
