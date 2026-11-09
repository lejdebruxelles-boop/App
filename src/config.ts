// ⚠️ Everything you must fill in before publishing is here. See docs/MONETISATION.md.

export const CONFIG = {
  /** RevenueCat → Project → API keys → Apple App Store public key (starts with "appl_"). */
  revenueCatIosKey: "appl_REPLACE_ME",
  /** Entitlement identifier created in RevenueCat that unlocks Mozaik+. */
  entitlement: "premium",

  /** AdMob ad unit IDs. The defaults are Google's official TEST units (no revenue). */
  admob: {
    interstitialIos: "ca-app-pub-3940256099942544/4411468910",
    rewardedIos: "ca-app-pub-3940256099942544/1712485313",
    /** Set to false once your real ad unit IDs are in place. */
    testing: true,
  },

  /** Free tier tuning (the levers that drive revenue). */
  freeHintsPerDay: 1,
  firstInterstitialLevel: 6, // never show ads to a brand new player
  interstitialEveryLevels: 3,
  minSecondsBetweenAds: 90,
  archiveDays: 90,
  webFreeLevels: 10, // the web demo stops here and points to the App Store

  /** Links shown on the paywall (required by Apple for subscriptions). */
  privacyUrl: "https://mozaik-puzzle.netlify.app/privacy.html",
  termsUrl: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  appStoreUrl: "https://apps.apple.com/app/mozaik",
};
