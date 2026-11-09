// ⚠️ Everything you must fill in before publishing is here. See docs/MONETISATION.md.

export const CONFIG = {
  /** RevenueCat → Project → API keys → Apple App Store public key (starts with "appl_"). */
  revenueCatIosKey: "appl_REPLACE_ME",
  /** Entitlement identifier created in RevenueCat that unlocks Mozaik+. */
  entitlement: "premium",

  /** AdMob ad unit IDs (account pub-1794379358634467, app "Mozaik – Color Puzzle"). */
  admob: {
    interstitialIos: "ca-app-pub-1794379358634467/5376485065",
    rewardedIos: "ca-app-pub-1794379358634467/3986160580",
    /** true = Google test ads (TestFlight builds, never click real ads on your own phone).
     *  Set to false only for the App Store release build. */
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
  appStoreUrl: "https://apps.apple.com/app/id6832640365",
};
