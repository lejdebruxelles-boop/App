// Thin wrappers that use native Capacitor plugins on iOS and web APIs elsewhere.
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

const native = Capacitor.isNativePlatform();

export async function hapticTap() {
  try {
    if (native) await Haptics.impact({ style: ImpactStyle.Light });
    else navigator.vibrate?.(8);
  } catch { /* noop */ }
}

export async function hapticWin() {
  try {
    if (native) await Haptics.notification({ type: NotificationType.Success });
    else navigator.vibrate?.([20, 40, 20]);
  } catch { /* noop */ }
}

export type ShareResult = "shared" | "copied" | "failed";

/** Share sheet when available, otherwise the clipboard. Reports what really happened. */
export async function shareText(text: string): Promise<ShareResult> {
  try {
    if (native) { await Share.share({ text }); return "shared"; }
    if (navigator.share) { await navigator.share({ text }); return "shared"; }
  } catch { /* user cancelled or unsupported → fall back */ }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

