import { test, expect } from "@playwright/test";
import { ChatPage } from "../pages/ChatPage";

test.beforeEach(async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.mockTauriBackend();
  await chat.goto();
});

test("user can send a message and receive a streamed response", async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.sendMessage("Hello AI");
  await chat.expectUserMessage("Hello AI");
  await chat.expectAiMessage("Hello from the mock stream!");
  await expect(chat.chatViewport.locator(".msg-meta")).toBeVisible();
});

test("chat stream error is rendered as a system error message", async ({ page }) => {
  await page.evaluate(() => {
    const invoke = (window as any).__TAURI_INTERNALS__.invoke;
    (window as any).__TAURI_INTERNALS__.invoke = async (cmd: string, args?: any) => {
      if (cmd === "send_command") {
        setTimeout(() => {
          const errCb = (window as any).__mock_emit;
          if (errCb) errCb("stream_error", "Mock LLM failure");
        }, 50);
        return null;
      }
      return invoke(cmd, args);
    };
  });

  const chat = new ChatPage(page);
  await chat.sendMessage("Trigger error");
  await chat.expectErrorMessage("Mock LLM failure");
});
