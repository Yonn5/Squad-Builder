import { Alert, Platform } from "react-native";

/**
 * Messages and confirmations, shown as the app's own pop-up (DialogHost,
 * mounted once at the root) rather than the browser's or the phone's
 * system dialog. Callers just call these two functions.
 */
export type DialogRequest = {
  title: string;
  message?: string;
  /** "alert" has a single OK; "confirm" has Cancel and Confirm. */
  kind: "alert" | "confirm";
  /** Confirm is shown in red: deleting, kicking, leaving, removing. */
  destructive: boolean;
  resolve: (confirmed: boolean) => void;
};

let host: ((request: DialogRequest) => void) | null = null;
const waiting: DialogRequest[] = [];

/** Called by DialogHost when it mounts (and with null when it unmounts). */
export function setDialogHost(next: ((request: DialogRequest) => void) | null) {
  host = next;
  if (host) while (waiting.length) host(waiting.shift()!);
}

function open(request: DialogRequest) {
  if (host) host(request);
  else if (waiting.length < 20) waiting.push(request);
  else fallback(request);
}

/** Only if the app's own pop-up is not mounted (it always is in the app). */
function fallback(request: DialogRequest) {
  const text = request.message
    ? `${request.title}\n\n${request.message}`
    : request.title;
  if (Platform.OS === "web") {
    if (request.kind === "confirm")
      request.resolve((globalThis as any).confirm(text) === true);
    else {
      (globalThis as any).alert(text);
      request.resolve(true);
    }
    return;
  }
  Alert.alert(
    request.title,
    request.message,
    request.kind === "confirm"
      ? [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => request.resolve(false),
          },
          { text: "Confirm", onPress: () => request.resolve(true) },
        ]
      : [{ text: "OK", onPress: () => request.resolve(true) }],
  );
}

/** A message with a single OK button. */
export function showAlert(title: string, message?: string) {
  open({
    title,
    message,
    kind: "alert",
    destructive: false,
    resolve: () => {},
  });
}

const DESTRUCTIVE = /^(delete|kick|leave|remove|reset)/i;

/**
 * A Cancel / Confirm question. Resolves true when confirmed.
 * `action` names what Confirm does ("Delete", "Kick", ...); destructive
 * actions get a red Confirm button.
 */
export function confirmDialog(
  title: string,
  message: string,
  action = "OK",
): Promise<boolean> {
  return new Promise((resolve) =>
    open({
      title,
      message,
      kind: "confirm",
      destructive: DESTRUCTIVE.test(action),
      resolve,
    }),
  );
}
