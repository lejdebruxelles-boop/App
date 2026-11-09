import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulated native plugins (iOS). Each test re-imports the module with fresh state.
const listeners: Record<string, () => void> = {};
const admob = {
  requestConsentInfo: vi.fn(),
  showConsentForm: vi.fn(),
  trackingAuthorizationStatus: vi.fn(async () => ({ status: "authorized" })),
  requestTrackingAuthorization: vi.fn(),
  initialize: vi.fn(async () => {}),
  prepareInterstitial: vi.fn(async () => ({})),
  prepareRewardVideoAd: vi.fn(async () => ({})),
  showRewardVideoAd: vi.fn(),
  showInterstitial: vi.fn(async () => {}),
  addListener: vi.fn(async (name: string, fn: () => void) => { listeners[name] = fn; return { remove: async () => {} }; }),
};
const purchases = {
  configure: vi.fn(async () => {}),
  addCustomerInfoUpdateListener: vi.fn(async () => "id"),
  getCustomerInfo: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
  getOfferings: vi.fn(),
};

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true } }));
vi.mock("@capacitor-community/admob", () => ({
  AdMob: admob,
  AdmobConsentStatus: { REQUIRED: "REQUIRED", OBTAINED: "OBTAINED", NOT_REQUIRED: "NOT_REQUIRED" },
  RewardAdPluginEvents: { Dismissed: "dismissed", FailedToShow: "failedToShow" },
}));
vi.mock("@revenuecat/purchases-capacitor", () => ({ Purchases: purchases }));
vi.mock("../src/config", async (orig) => {
  const real = (await orig()) as { CONFIG: object };
  return { CONFIG: { ...real.CONFIG, revenueCatIosKey: "appl_test" } };
});

async function fresh() {
  vi.resetModules();
  return import("../src/monetization");
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(listeners)) delete listeners[k];
});

describe("ads consent (GDPR)", () => {
  it("never starts ads when consent info cannot be obtained", async () => {
    admob.requestConsentInfo.mockRejectedValueOnce(new Error("offline"));
    const m = await fresh();
    await m.initMonetization(false);
    expect(admob.initialize).not.toHaveBeenCalled();
    expect(m.rewardedAvailable()).toBe(false);
  });

  it("never starts ads when the user has not given consent", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "REQUIRED", isConsentFormAvailable: true, canRequestAds: false });
    admob.showConsentForm.mockResolvedValueOnce({ status: "REQUIRED", canRequestAds: false });
    const m = await fresh();
    await m.initMonetization(false);
    expect(admob.showConsentForm).toHaveBeenCalled();
    expect(admob.initialize).not.toHaveBeenCalled();
  });

  it("asks consent first, then ATT, then starts the SDK", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "NOT_REQUIRED", canRequestAds: true });
    admob.trackingAuthorizationStatus.mockResolvedValueOnce({ status: "notDetermined" });
    const m = await fresh();
    await m.initMonetization(false);
    const order = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder[0];
    expect(order(admob.requestConsentInfo)).toBeLessThan(order(admob.requestTrackingAuthorization));
    expect(order(admob.requestTrackingAuthorization)).toBeLessThan(order(admob.initialize));
    expect(m.rewardedAvailable()).toBe(true);
  });

  it("premium players never get ads", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "OBTAINED", canRequestAds: true });
    purchases.getCustomerInfo.mockResolvedValueOnce({ customerInfo: { entitlements: { active: { premium: {} } } } });
    const m = await fresh();
    await m.initMonetization(false);
    expect(m.isPremium()).toBe(true);
    expect(m.rewardedAvailable()).toBe(false);
    expect(await m.maybeInterstitial(50, 10)).toBe(false);
  });
});

describe("rewarded video", () => {
  async function ready() {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "OBTAINED", canRequestAds: true });
    const m = await fresh();
    await m.initMonetization(false);
    await new Promise((r) => setTimeout(r, 0)); // let preloads finish
    return m;
  }

  it("gives the reward only when earned", async () => {
    admob.showRewardVideoAd.mockResolvedValueOnce({ type: "hint", amount: 1 });
    const m = await ready();
    expect(await m.showRewarded()).toBe(true);
  });

  it("settles to false when the player closes the video early (native call never resolves)", async () => {
    admob.showRewardVideoAd.mockReturnValueOnce(new Promise(() => {}));
    const m = await ready();
    const p = m.showRewarded();
    await new Promise((r) => setTimeout(r, 0));
    listeners["dismissed"]();
    expect(await p).toBe(false);
  });

  it("settles to false when the ad fails to show", async () => {
    admob.showRewardVideoAd.mockReturnValueOnce(new Promise(() => {}));
    const m = await ready();
    const p = m.showRewarded();
    await new Promise((r) => setTimeout(r, 0));
    listeners["failedToShow"]();
    expect(await p).toBe(false);
  });
});

describe("purchases", () => {
  it("treats a cancelled purchase (native error shape) as a cancel, not an error", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "OBTAINED", canRequestAds: true });
    purchases.purchasePackage.mockRejectedValueOnce({ code: "1", message: "Purchase was cancelled.", data: { userCancelled: true } });
    const m = await fresh();
    await m.initMonetization(false);
    await expect(m.purchase({ id: "a", kind: "annual", price: "19,99 €", trial: null, renews: true, pkg: {} })).resolves.toBe(false);
  });

  it("propagates real purchase errors and does not unlock premium", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "OBTAINED", canRequestAds: true });
    purchases.purchasePackage.mockRejectedValueOnce({ code: "2", message: "Store problem" });
    const m = await fresh();
    await m.initMonetization(false);
    await expect(m.purchase({ id: "a", kind: "annual", price: "x", trial: null, renews: true, pkg: {} })).rejects.toBeTruthy();
    expect(m.isPremium()).toBe(false);
  });

  it("a stale cached premium flag is revoked by the store at launch", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "OBTAINED", canRequestAds: true });
    const m = await fresh();
    await m.initMonetization(true);
    expect(m.isPremium()).toBe(false);
  });

  it("reads free-trial offers with a typed unit", async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({ status: "OBTAINED", canRequestAds: true });
    purchases.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [
      { identifier: "$rc_monthly", packageType: "MONTHLY", product: { priceString: "3,99 €", introPrice: null } },
      { identifier: "$rc_annual", packageType: "ANNUAL", product: { priceString: "19,99 €", introPrice: { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7 } } },
    ] } });
    const m = await fresh();
    await m.initMonetization(false);
    const offers = await m.getOffers();
    expect(offers[0].kind).toBe("annual");
    expect(offers[0].trial).toEqual({ n: 7, unit: "day" });
    expect(offers[0].renews).toBe(true);
  });
});
