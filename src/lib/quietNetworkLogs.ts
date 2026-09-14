/**
 * supabase-js logs the raw fetch failure with console.error from inside
 * its own catch blocks, even though the call returns the error to us and
 * we show it in the UI. In development that bare TypeError surfaces as a
 * red "Failed to fetch" overlay, which means nothing to a player.
 *
 * Drop exactly those single-argument network errors; everything else,
 * including any multi-argument diagnostic, still logs.
 */
const HANDLED =
  /^(TypeError: )?(failed to fetch|network request failed|networkerror when attempting to fetch the resource)\.?$/i;

export function silenceHandledNetworkLogs() {
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.length === 1) {
      const only = args[0];
      const text =
        only instanceof Error ? `${only.name}: ${only.message}` : String(only ?? "");
      if (HANDLED.test(text) || HANDLED.test(text.replace(/^TypeError: /, ""))) {
        return;
      }
    }
    original(...args);
  };
}
