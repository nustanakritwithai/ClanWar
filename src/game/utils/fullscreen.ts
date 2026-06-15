/** True when the document is in native fullscreen (incl. WebKit). */
export function isFullscreenActive(): boolean {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/** Request fullscreen on the game root. Must be called from a user gesture. */
export async function requestGameFullscreen(): Promise<void> {
  try {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    }
  } catch {
    // Blocked or unsupported — safe to ignore.
  }
}

/** Best-effort landscape lock on mobile browsers that support Screen Orientation API. */
export async function tryLockLandscape(): Promise<void> {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (orientation?.lock) {
      await orientation.lock('landscape');
    }
  } catch {
    // Not supported or denied — safe to ignore.
  }
}
