import { Alert, Platform } from "react-native";

/**
 * React Native's Alert is a silent no-op on web, so route feedback
 * through the browser's native dialogs there.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    (globalThis as any).alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/** Cross-platform OK/Cancel confirmation. Resolves true when confirmed. */
export function confirmDialog(
  title: string,
  message: string,
  confirmLabel = "OK",
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(
      (globalThis as any).confirm(`${title}\n\n${message}`) === true,
    );
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
