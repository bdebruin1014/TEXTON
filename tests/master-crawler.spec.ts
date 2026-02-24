import { test } from "@playwright/test";

// Configuration
const START_URL = process.env.BASE_URL || "http://localhost:5173";
const MAX_DEPTH = 5;
const visitedUrls = new Set<string>();

test("Deep Crawl: Forms, Buttons, and Links", async ({ page }) => {
  const errors: string[] = [];

  // 1. Listen for Console Errors (Supabase/API failures)
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`Console Error: ${msg.text()} at ${page.url()}`);
  });

  // 2. Listen for Failed Network Requests (Supabase 400/500s)
  page.on("requestfailed", (request) => {
    errors.push(`Network Failure: ${request.url()} - ${request.failure()?.errorText}`);
  });

  async function crawl(url: string, depth: number) {
    if (depth > MAX_DEPTH || visitedUrls.has(url) || !url.startsWith(START_URL)) return;

    visitedUrls.add(url);
    console.log(`Checking: ${url} (Depth: ${depth})`);

    await page.goto(url, { waitUntil: "networkidle" });

    // --- A. TEST ALL FORMS ---
    const forms = page.locator("form");
    const formCount = await forms.count();
    for (let i = 0; i < formCount; i++) {
      const form = forms.nth(i);
      console.log(`  - Filling form on ${url}`);

      // Fill all text inputs/textareas with dummy data
      const inputs = form.locator('input:not([type="submit"]), textarea');
      const inputCount = await inputs.count();
      for (let j = 0; j < inputCount; j++) {
        const type = await inputs.nth(j).getAttribute("type");
        if (type === "email") await inputs.nth(j).fill("test@example.com");
        else if (type === "number") await inputs.nth(j).fill("123");
        else await inputs.nth(j).fill("Test Data");
      }

      // Try to submit the form
      const submitBtn = form.locator('button[type="submit"], input[type="submit"]');
      if ((await submitBtn.count()) > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(1000); // Wait for Supabase response
      }
    }

    // --- B. TEST ALL BUTTONS (Non-form) ---
    const buttons = page.locator('button:not([type="submit"])');
    const btnCount = await buttons.count();
    for (let i = 0; i < btnCount; i++) {
      try {
        await buttons.nth(i).click({ timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (_e) {
        // Button might be hidden or a navigation trigger, that's okay
      }
    }

    // --- C. RECURSIVE LINKS ---
    const hrefs = await page.locator("a").evaluateAll((list) => list.map((el) => (el as HTMLAnchorElement).href));

    for (const href of hrefs) {
      if (href.startsWith(START_URL)) {
        await crawl(href, depth + 1);
      }
    }
  }

  await crawl(START_URL, 0);

  // Final Reporting
  if (errors.length > 0) {
    console.error("--- CRITICAL ISSUES FOUND ---");
    for (const err of errors) {
      console.error(err);
    }
    throw new Error(`Found ${errors.length} UI/Database errors during crawl.`);
  }
});
