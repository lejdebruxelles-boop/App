import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.antonis.mozaik", // must match the Bundle ID you create on developer.apple.com
  appName: "Mozaik",
  webDir: "dist",
  backgroundColor: "#14121f",
  ios: { contentInset: "never", scheme: "Mozaik" },
};

export default config;
