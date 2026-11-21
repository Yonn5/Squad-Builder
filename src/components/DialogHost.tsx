import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { setDialogHost, type DialogRequest } from "../lib/alert";
import { colors } from "../theme";

/**
 * The app's own pop-up for showAlert and confirmDialog (lib/alert.ts).
 * Mounted once at the root; requests queue up and are shown one at a time.
 */
export function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  useEffect(() => {
    setDialogHost((request) => setQueue((q) => [...q, request]));
    return () => setDialogHost(null);
  }, []);

  const current = queue[0];
  const answer = (confirmed: boolean) => {
    current?.resolve(confirmed);
    setQueue((q) => q.slice(1));
  };

  return (
    <Modal
      visible={!!current}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => answer(false)}
    >
      <View style={styles.backdrop}>
        {current ? (
          <View style={styles.box} testID="dialog" accessibilityRole="alert">
            <Text style={styles.title} testID="dialog-title">
              {current.title}
            </Text>
            {current.message ? (
              <Text style={styles.message} testID="dialog-message">
                {current.message}
              </Text>
            ) : null}
            <View style={styles.buttons}>
              {current.kind === "confirm" ? (
                <>
                  <Pressable
                    testID="dialog-cancel"
                    accessibilityRole="button"
                    onPress={() => answer(false)}
                    style={({ pressed }) => [
                      styles.button,
                      styles.cancel,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="dialog-confirm"
                    accessibilityRole="button"
                    onPress={() => answer(true)}
                    style={({ pressed }) => [
                      styles.button,
                      current.destructive ? styles.danger : styles.primary,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={
                        current.destructive
                          ? styles.dangerText
                          : styles.primaryText
                      }
                    >
                      Confirm
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  testID="dialog-confirm"
                  accessibilityRole="button"
                  onPress={() => answer(true)}
                  style={({ pressed }) => [
                    styles.button,
                    styles.primary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryText}>OK</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  box: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 8 },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancel: { backgroundColor: colors.surfaceAlt },
  cancelText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  primary: { backgroundColor: colors.accent },
  primaryText: { color: "#08351d", fontWeight: "800", fontSize: 15 },
  danger: { backgroundColor: colors.danger },
  dangerText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  pressed: { opacity: 0.75 },
});
