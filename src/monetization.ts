// Revenue: Mozaik+ (subscription / lifetime via RevenueCat) + AdMob ads for free players.
//
// - iOS: real in-app purchases and ads.
// - Desktop (Electron): sold as a paid app on the Microsoft Store → everything unlocked.
// - Web: free demo, the paywall sends players to the App Store.
import { Capacitor } from "@capacitor/core";
import { CONFIG } from "./config";

export type Platform = "ios" | "desktop" | "web";
export const platform: Platform = Capacitor.getPlatform() === "ios"
  ? "ios"
  : navigator.userAgent.includes("Electron") ? "desktop" : "web";

export interface Offer {
  id: string;
  kind: "annual" | "monthly" | "lifetime" | "other";
  price: string;
  trial: string | null; // e.g. "7 days" when an intro offer exists
  pkg: unknown; // native package object, passed back to purchase()
}

let premium = false;
let listeners: ((p: boolean) => void)[] = [];
let rcReady = false;
let adsReady = false;
let lastAdAt = 0;
let interstitialLoaded = false;
let rewardedLoaded = false;

const rcConfigured = () => !CONFIG.revenueCatIosKey.includes("REPLACE");

function setPremium(p: boolean) {
  if (p === premium) return;
  premium = p;
  listeners.forEach((l) => l(p));
}

export function isPremium() {
  return premium;
}

export function onPremiumChange(fn: (p: boolean) => void) {
  listeners.push(fn);
}

export async function initMonetization(cachedPremium: boolean) {
  premium = platform === "desktop" ? true : cachedPremium;
  if (platform !== "ios") return;
  await Promise.allSettled([initPurchases(), initAds()]);
}

// ---------- purchases ----------
async function initPurchases() {
  if (!rcConfigured()) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.configure({ apiKey: CONFIG.revenueCatIosKey });
  rcReady = true;
  await Purchases.addCustomerInfoUpdateListener((info) => {
    setPremium(Boolean(info.entitlements.active[CONFIG.entitlement]));
  });
  const { customerInfo } = await Purchases.getCustomerInfo();
  setPremium(Boolean(customerInfo.entitlements.active[CONFIG.entitlement]));
}

export function purchasesAvailable() {
  return platform === "ios" && rcReady;
}

export async function getOffers(): Promise<Offer[]> {
  if (!purchasesAvailable()) return [];
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  const order = { annual: 0, monthly: 1, lifetime: 2, other: 3 };
  return pkgs
    .map((p): Offer => {
      const kind = p.packageType === "ANNUAL" ? "annual"
        : p.packageType === "MONTHLY" ? "monthly"
        : p.packageType === "LIFETIME" ? "lifetime" : "other";
      const intro = p.product.introPrice;
      const trial = intro && intro.price === 0
        ? `${intro.periodNumberOfUnits} ${intro.periodUnit.toLowerCase()}` : null;
      return { id: p.identifier, kind, price: p.product.priceString, trial, pkg: p };
    })
    .sort((a, b) => order[a.kind] - order[b.kind]);
}

/** Returns true on success, false if cancelled. Throws on real errors. */
export async function purchase(offer: Offer): Promise<boolean> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await Purchases.purchasePackage({ aPackage: offer.pkg as any });
    const ok = Boolean(res.customerInfo.entitlements.active[CONFIG.entitlement]);
    setPremium(ok);
    return ok;
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.restorePurchases();
  const ok = Boolean(customerInfo.entitlements.active[CONFIG.entitlement]);
  setPremium(ok);
  return ok;
}

// ---------- ads ----------
async function initAds() {
  const { AdMob, AdmobConsentStatus } = await import("@capacitor-community/admob");
  await AdMob.initialize({ initializeForTesting: CONFIG.admob.testing });
  // GDPR (EU/UK) consent form, then Apple's App Tracking Transparency prompt.
  try {
    const consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      await AdMob.showConsentForm();
    }
    const att = await AdMob.trackingAuthorizationStatus();
    if (att.status === "notDetermined") await AdMob.requestTrackingAuthorization();
  } catch { /* ads still work, non-personalised */ }
  adsReady = true;
  preloadInterstitial();
  preloadRewarded();
}

async function preloadInterstitial() {
  if (!adsReady || premium) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({ adId: CONFIG.admob.interstitialIos, isTesting: CONFIG.admob.testing });
    interstitialLoaded = true;
  } catch { interstitialLoaded = false; }
}

async function preloadRewarded() {
  if (!adsReady || premium) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareRewardVideoAd({ adId: CONFIG.admob.rewardedIos, isTesting: CONFIG.admob.testing });
    rewardedLoaded = true;
  } catch { rewardedLoaded = false; }
}

export function rewardedAvailable() {
  return platform === "ios" && adsReady && !premium;
}

/** Shows a rewarded video. Resolves true if the player earned the reward. */
export async function showRewarded(): Promise<boolean> {
  if (!rewardedAvailable()) return false;
  const { AdMob } = await import("@capacitor-community/admob");
  try {
    if (!rewardedLoaded) await preloadRewarded();
    rewardedLoaded = false;
    const reward = await AdMob.showRewardVideoAd();
    lastAdAt = Date.now();
    return Boolean(reward);
  } catch {
    return false;
  } finally {
    preloadRewarded();
  }
}

/** Called after each level win. Shows an interstitial when the pacing rules allow it. */
export async function maybeInterstitial(level: number, levelsSinceAd: number): Promise<boolean> {
  if (platform !== "ios" || !adsReady || premium || !interstitialLoaded) return false;
  if (level < CONFIG.firstInterstitialLevel) return false;
  if (levelsSinceAd < CONFIG.interstitialEveryLevels) return false;
  if (Date.now() - lastAdAt < CONFIG.minSecondsBetweenAds * 1000) return false;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    interstitialLoaded = false;
    await AdMob.showInterstitial();
    lastAdAt = Date.now();
    return true;
  } catch {
    return false;
  } finally {
    preloadInterstitial();
  }
}

export async function showPrivacyOptions() {
  if (platform !== "ios") return;
  const { AdMob } = await import("@capacitor-community/admob");
  try { await AdMob.showPrivacyOptionsForm(); } catch { /* not required in this region */ }
}

// ---------- ratings (more ratings → better ranking → more downloads) ----------
export async function requestReview() {
  if (platform !== "ios") return;
  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
  } catch { /* noop */ }
}
