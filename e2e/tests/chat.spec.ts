import { test, expect } from "@playwright/test";
import { ChatPage } from "../pages/ChatPage";

test.beforeEach(async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.mockTauriBackend();
  await chat.goto();
});

test("user can send a message and see it in the conversation", async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.sendMessage("Hello AI");
  await chat.expectUserMessage("Hello AI");
  // Assistant placeholder is appended immediately
  await expect(chat.chatViewport.locator(".msg-card.message.assistant")).toBeVisible();
  await expect(chat.chatViewport.locator(".msg-meta").first()).toBeVisible();
});

test("chat stream error shows an error alert", async ({ page }) => {
  await page.evaluate(() => {
    const orig = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/send_command")) {
        return new Response("Mock LLM failure", { status: 500 });
      }
      return orig(input, init);
    };
  });

  const chat = new ChatPage(page);
  await chat.sendMessage("Trigger error");
  await chat.expectErrorMessage("Mock LLM failure");
});
