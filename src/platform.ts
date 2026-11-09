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

/** Returns true if shared via a share sheet, false if copied to clipboard. */
export async function shareText(text: string): Promise<boolean> {
  try {
    if (native) { await Share.share({ text }); return true; }
    if (navigator.share) { await navigator.share({ text }); return true; }
  } catch { /* user cancelled or unsupported → fall back */ }
  try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  return false;
}

