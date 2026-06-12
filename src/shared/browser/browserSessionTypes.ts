export type { BrowserProfile } from "./browserContracts";

export type SessionClearOptions = {
  cache?: boolean;
  cookies?: boolean;
  localStorage?: boolean;
  history?: boolean;
  bookmarks?: boolean;
  permissions?: boolean;
};
