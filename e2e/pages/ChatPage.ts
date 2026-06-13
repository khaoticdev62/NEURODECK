import { Page, Locator, expect } from "@playwright/test";
import { AppPage } from "./AppPage";

export class ChatPage extends AppPage {
  readonly chatInput: Locator;
  readonly sendBtn: Locator;
  readonly chatViewport: Locator;

  constructor(page: Page) {
    super(page);
    this.chatInput = page.getByTestId("chat-input");
    this.sendBtn = page.getByTestId("chat-send-btn");
    this.chatViewport = page.locator("#chat-viewport");
  }

  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.chatInput.press("Enter");
  }

  async expectUserMessage(text: string) {
    await expect(this.chatViewport.locator(".msg-card.message.user .msg-content").last()).toContainText(text);
  }

  async expectAiMessage(text: string, timeout = 10000) {
    await expect(this.chatViewport.locator(".msg-card.message.assistant .msg-content").last()).toContainText(text, { timeout });
  }

  async expectErrorMessage(text: string, timeout = 10000) {
    await expect(this.page.locator("[role='alert']")).toContainText(text, { timeout });
  }
}
