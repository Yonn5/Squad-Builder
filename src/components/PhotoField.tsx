import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { showAlert } from "../lib/alert";
import {
  cutOutPhotoBackground,
  pickPhotoFromLibrary,
  PhotoError,
  type PhotoData,
} from "../lib/photo";
import { colors } from "../theme";
import { Button } from "./ui";

/** A photo being edited, plus the untouched pick it came from. */
export type CardPhoto = {
  /** What the card shows: a data URI while editing, an https URL once saved. */
  uri: string;
  /** Set only for a photo chosen in this session, and only then uploadable. */
  data?: PhotoData;
  /** The pick before the background was taken out, so it can be put back. */
  original?: PhotoData;
};

/**
 * Choosing, cutting out and clearing the card photo. Nothing here touches the
 * database — the screen saves the finished photo along with the rest of the
 * card.
 */
export function PhotoField({
  value,
  onChange,
}: {
  value: CardPhoto | null;
  onChange: (photo: CardPhoto | null) => void;
}) {
  const [busy, setBusy] = useState<"pick" | "cut" | null>(null);

  const run = async (kind: "pick" | "cut", work: () => Promise<void>) => {
    setBusy(kind);
    try {
      await work();
    } catch (error) {
      showAlert(
        "Photo problem",
        error instanceof PhotoError
          ? error.message
          : "That photo could not be used. Try a different one.",
      );
    } finally {
      setBusy(null);
    }
  };

  const choose = () =>
    run("pick", async () => {
      const picked = await pickPhotoFromLibrary();
      if (picked) onChange({ uri: picked.uri, data: picked, original: picked });
    });

  const cutOut = () =>
    run("cut", async () => {
      const source = value?.original ?? value?.data;
      if (!source) return;
      const { photo, confident } = await cutOutPhotoBackground(source);
      if (!confident) {
        // Leaving scraps of a player on the card is worse than leaving the
        // photo alone, so this one is refused rather than applied.
        showAlert(
          "Background too close in colour",
          "This one can't be cut out cleanly: somewhere they meet, the background is the same colour as what the player is wearing, so there's no edge to cut along. A photo taken against a plain wall or open sky will work.",
        );
        return;
      }
      onChange({ uri: photo.uri, data: photo, original: source });
    });

  const undo = () => {
    if (!value?.original) return;
    onChange({
      uri: value.original.uri,
      data: value.original,
      original: value.original,
    });
  };

  const canCutOut = !!(value?.original ?? value?.data);
  const isCutOut = !!value?.original && value.data !== value.original;

  return (
    <View style={styles.row}>
      <View style={styles.preview}>
        {value ? (
          <Image
            source={{ uri: value.uri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.previewEmpty}>No photo</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title={value ? "Change Photo" : "Choose Photo"}
          onPress={choose}
          variant="secondary"
          loading={busy === "pick"}
          disabled={busy !== null}
        />
        {isCutOut ? (
          <Button
            title="Undo Cut-Out"
            onPress={undo}
            variant="secondary"
            disabled={busy !== null}
          />
        ) : (
          <Button
            title="Remove Background"
            onPress={cutOut}
            variant="secondary"
            loading={busy === "cut"}
            disabled={busy !== null || !canCutOut}
          />
        )}
        {value ? (
          <Button
            title="Remove Photo"
            onPress={() => onChange(null)}
            variant="secondary"
            disabled={busy !== null}
          />
        ) : null}
        <Text style={styles.hint}>
          {canCutOut
            ? "Cutting the background out works best on a photo taken against a plain wall or an open sky."
            : "Pick a photo from your library, then cut the background out so only you show on the card."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  preview: {
    width: 92,
    height: 122,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  previewEmpty: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  actions: { flex: 1, gap: 8 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
