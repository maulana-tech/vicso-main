import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: "https://vicso-main.vercel.app",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});