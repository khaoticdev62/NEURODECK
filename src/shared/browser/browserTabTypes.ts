export type { BrowserTabId, BrowserTabState, BrowserSecurityState, BrowserTab } from "./browserContracts";
export type TabCreationOptions = {
  url?: string;
  profileId?: string;
  isPrivate?: boolean;
  isPinned?: boolean;
};
export type TabUpdatePayload = Partial<Omit<import("./browserContracts").BrowserTab, "id" | "partitionId">>;
export type TabOverviewItem = {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
};
