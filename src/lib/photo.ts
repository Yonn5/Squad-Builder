import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { decode as decodeJpeg } from "jpeg-js";
import { cutOutSubject } from "../logic/segment";
import { base64ToBytes, bytesToBase64 } from "./binary";
import { encodePng } from "./png";

/** Longest side kept for the photo that ends up on the card. */
const CARD_SIZE = 700;
/** Longest side the background fill runs at; smaller is faster and smoother. */
const WORK_SIZE = 512;

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

export type CutoutOutcome = {
  photo: PhotoData;
  /**
   * False when the result cannot be a player: too little or too much of the
   * frame survived, or what survived is scattered scraps rather than one
   * shape. Both mean the backdrop was too close in colour to tell apart
   * somewhere the two touch.
   */
  confident: boolean;
};

/** Keeps the player and makes everything around them transparent. */
export async function cutOutPhotoBackground(
  photo: PhotoData,
): Promise<CutoutOutcome> {
  const work = await toJpeg(photo.uri, WORK_SIZE);
  const decoded = decodeJpeg(base64ToBytes(work.base64), {
    useTArray: true,
    formatAsRGBA: true,
  });

  const subject = cutOutSubject({
    data: decoded.data,
    width: decoded.width,
    height: decoded.height,
  });
  const base64 = bytesToBase64(
    encodePng(subject.data, subject.width, subject.height),
  );

  return {
    // The cut-out only exists as bytes in memory, so it is shown as a data
    // URI; nothing manipulates it again, the original is kept for that.
    photo: {
      uri: `data:image/png;base64,${base64}`,
      base64,
      mime: "image/png",
    },
    confident:
      subject.coverage > 0.04 &&
      subject.coverage < 0.95 &&
      subject.dominance > 0.85,
  };
}
