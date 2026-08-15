// Bridge to the Capacitor native shell.
//
// Plugins are reached through the runtime `window.Capacitor` global instead of
// static imports. That keeps every helper here safe to call from shared code:
// on the web the globals are absent and each function degrades to its browser
// behaviour, so no caller needs to branch on platform.

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>;
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

export type NativePlatform = "web" | "android" | "ios";

export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
};

export const getPlatform = (): NativePlatform => {
  if (typeof window === "undefined") return "web";
  const platform = window.Capacitor?.getPlatform?.();
  return platform === "android" || platform === "ios" ? platform : "web";
};

/** Returns a Capacitor plugin, or null when running on the web or if the plugin is not installed. */
export const getPlugin = <T = any>(name: string): T | null => {
  if (!isNativeApp()) return null;
  return (window.Capacitor?.Plugins?.[name] as T) ?? null;
};

/**
 * Opens a URL outside the WebView.
 *
 * Non-http schemes such as `upi://` cannot be handed to the WebView: it has no
 * handler for them, so an in-page navigation is dropped and the user sees
 * nothing happen. Routing through AppLauncher hands the URL to Android, which
 * resolves it to the installed UPI app.
 */
export const openExternalUrl = async (url: string): Promise<boolean> => {
  const launcher = getPlugin<{ openUrl: (o: { url: string }) => Promise<unknown> }>("AppLauncher");
  if (launcher) {
    try {
      await launcher.openUrl({ url });
      return true;
    } catch (err) {
      console.warn("Native URL open failed:", err);
      return false;
    }
  }

  if (typeof window === "undefined") return false;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return true;

  // Custom schemes are frequently blocked by popup heuristics, so fall back to
  // a direct navigation which the browser can still hand to the OS.
  window.location.href = url;
  return true;
};

/** Applies the native chrome (status bar colour, splash dismissal). No-op on web. */
export const applyNativeChrome = async (): Promise<void> => {
  if (!isNativeApp()) return;

  const statusBar = getPlugin<{
    setStyle: (o: { style: string }) => Promise<void>;
    setBackgroundColor: (o: { color: string }) => Promise<void>;
  }>("StatusBar");

  if (statusBar) {
    try {
      await statusBar.setStyle({ style: "DARK" });
      // Android only; throws on platforms without a settable colour.
      await statusBar.setBackgroundColor({ color: "#08070f" }).catch(() => undefined);
    } catch (err) {
      console.warn("Status bar styling skipped:", err);
    }
  }

  // The splash screen is configured not to auto-hide so it covers the first
  // paint. It must be dismissed once the app shell is mounted, otherwise it
  // stays on screen for the whole session.
  const splash = getPlugin<{ hide: () => Promise<void> }>("SplashScreen");
  if (splash) {
    try {
      await splash.hide();
    } catch (err) {
      console.warn("Splash hide skipped:", err);
    }
  }
};

type BackButtonHandler = () => void;

/**
 * Registers the Android hardware back button.
 *
 * Without a handler Capacitor closes the app on every back press, so a user
 * one screen deep is ejected instead of returning to the previous view.
 * Returns a cleanup function.
 */
export const registerBackButton = (handler: BackButtonHandler): (() => void) => {
  const app = getPlugin<{
    addListener: (event: string, cb: () => void) => unknown;
  }>("App");
  if (!app) return () => undefined;

  let removed = false;
  let handle: { remove: () => Promise<void> } | null = null;

  // `addListener` is called through the raw `window.Capacitor.Plugins` proxy
  // rather than the typed `@capacitor/app` package, so it is not guaranteed to
  // return a real native Promise on every bridge implementation. Chaining
  // `.then()` directly on it previously threw `... .then is not a function`
  // synchronously at module load, which crashed the whole render tree before
  // anything mounted — the app showed a black screen with nothing in #root.
  // `Promise.resolve(...)` normalises any return shape (Promise, thenable, or
  // a plain value) into a real Promise before chaining.
  try {
    Promise.resolve(app.addListener("backButton", handler))
      .then((h: any) => {
        handle = h;
        if (removed) void h?.remove?.();
      })
      .catch((err: unknown) => console.warn("Back button listener failed:", err));
  } catch (err) {
    console.warn("Back button listener registration threw synchronously:", err);
  }

  return () => {
    removed = true;
    if (handle) void handle.remove();
  };
};

/** Closes the app. Only meaningful on Android. */
export const exitApp = async (): Promise<void> => {
  const app = getPlugin<{ exitApp: () => Promise<void> }>("App");
  if (!app) return;
  try {
    await app.exitApp();
  } catch (err) {
    console.warn("Exit app failed:", err);
  }
};
