import { test, expect, chromium } from "@playwright/test";

const BASE = "https://vicso-main.vercel.app";

test("Trading page loads and shows data", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => errors.push(err.message));

  await page.goto(`${BASE}/trading`, { waitUntil: "networkidle", timeout: 30000 });
  console.log("Title:", await page.title());

  // Wait for data to load
  await page.waitForTimeout(6000);

  // Check chart container exists
  const chartEl = await page.locator(".tv-lightweight-charts").count();
  console.log("Chart elements:", chartEl);

  // Check price displayed
  const priceEl = await page.locator("text=/\\$[0-9,]+\\.[0-9]+/").count();
  console.log("Price elements:", priceEl);

  // Check order book
  const ob = await page.locator("text=Order Book").count();
  console.log("Order Book found:", ob);

  // Check symbols shown
  const eth = await page.locator("text=ETH").count();
  console.log("ETH found:", eth);

  const body = await page.locator("body").innerText();
  console.log("Body (first 800 chars):", body.slice(0, 800));

  console.log("\nErrors:", errors.length);
  if (errors.length) errors.slice(0, 5).forEach(e => console.log("  ERROR:", e));

  expect(errors.filter(e => !e.includes("favicon") && !e.includes("manifest"))).toHaveLength(0);
});