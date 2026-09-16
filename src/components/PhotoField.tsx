import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { showAlert } from "../lib/alert";
import {
  pickPhotoFromLibrary,
  PhotoError,
  type PhotoData,
} from "../lib/photo";
import { colors } from "../theme";
import { PhotoEditor, type EditSession } from "./PhotoEditor";
import { Button } from "./ui";

/** A photo being edited, plus the untouched pick it came from. */
export type CardPhoto = {
  /** What the card shows: a data URI while editing, an https URL once saved. */
  uri: string;
  /** Set only for a photo chosen in this session, and only then uploadable. */
  data?: PhotoData;
  /** The pick before any cropping or brushing, so it can be put back. */
  original?: PhotoData;
};

/**
 * Choosing and editing the card photo. Nothing here touches the database —
 * the screen saves the finished photo along with the rest of the card.
 */
export function PhotoField({
  value,
  onChange,
}: {
  value: CardPhoto | null;
  onChange: (photo: CardPhoto | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  // Held so reopening the editor resumes the crop and brushwork rather than
  // starting again from the original photo.
  const [session, setSession] = useState<EditSession | null>(null);

  const choose = async () => {
    setPicking(true);
    try {
      const picked = await pickPhotoFromLibrary();
      if (!picked) return;
      setSession(null);
      onChange({ uri: picked.uri, data: picked, original: picked });
    } catch (error) {
      showAlert(
        "Photo problem",
        error instanceof PhotoError
          ? error.message
          : "That photo could not be used. Try a different one.",
      );
    } finally {
      setPicking(false);
    }
  };

  const undo = () => {
    if (!value?.original) return;
    setSession(null);
    onChange({
      uri: value.original.uri,
      data: value.original,
      original: value.original,
    });
  };

  // Editing needs the photo's pixels, which only exist for a photo picked in
  // this session; one already saved is just a URL on the card.
  const source = value?.original;
  const edited = !!source && value?.data !== source;

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
          loading={picking}
          disabled={picking}
        />
        <Button
          title="Crop & Cut Out"
          onPress={() => setEditing(true)}
          variant="secondary"
          disabled={!source || picking}
        />
        {edited ? (
          <Button title="Undo Edits" onPress={undo} variant="secondary" />
        ) : null}
        {value ? (
          <Button
            title="Remove Photo"
            onPress={() => {
              setSession(null);
              onChange(null);
            }}
            variant="secondary"
          />
        ) : null}
        <Text style={styles.hint}>
          {source
            ? "Crop the photo to frame yourself, then rub the background away with your finger. Remove Background inside the editor has a go at it for you first."
            : "Pick a photo from your library, then crop it and cut the background out so only you show on the card."}
        </Text>
      </View>

      {source ? (
        <PhotoEditor
          visible={editing}
          source={source}
          session={session}
          onCancel={() => setEditing(false)}
          onDone={(photo, next) => {
            setEditing(false);
            setSession(next);
            onChange({ uri: photo.uri, data: photo, original: source });
          }}
        />
      ) : null}
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
