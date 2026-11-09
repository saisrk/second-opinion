import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Second Opinion",
    description: "Evidence-based second opinion on product reviews.",
    permissions: ["sidePanel", "storage", "offscreen", "activeTab"],
  },
});
