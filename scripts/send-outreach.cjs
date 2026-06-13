const { chromium } = require("playwright");
const fs = require("fs");

async function main() {
  const messages = JSON.parse(fs.readFileSync("scripts/outreach-messages.json", "utf8"));

  // Use a disposable profile so it doesn't conflict with your running Chrome
  const context = await chromium.launchPersistentContext("./scripts/chrome-profile", {
    headless: false,
    channel: "chrome",
  });

  const page = await context.newPage();
  await page.goto("https://www.discogs.com/messages/compose");

  if (page.url().includes("/login")) {
    console.log("Log in to Discogs, then press Enter here...");
    await waitForEnter();
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n[${i + 1}/${messages.length}] ${msg.username}`);

    await page.goto("https://www.discogs.com/messages/compose");
    await page.fill('input[name="to"]', msg.username);
    await page.fill('input[name="subject"]', msg.subject);
    await page.fill('textarea[name="message"]', msg.body);

    console.log("  Review, solve CAPTCHA, click Send, then press Enter...");
    await waitForEnter();
  }

  await context.close();
  console.log("\nDone.");
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

main();
