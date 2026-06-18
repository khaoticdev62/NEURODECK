import { bridgeInvoke } from "../http";

export interface ApiRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export const apiLab = {
  async sendRequest(req: ApiRequest): Promise<ApiResponse> {
    return bridgeInvoke<ApiResponse>("api_request", req);
  },
  async listCollections() {
    return bridgeInvoke<string[]>("api_list_collections");
  },
  async saveCollection(name: string, requests: ApiRequest[]) {
    return bridgeInvoke<{ success: boolean }>("api_save_collection", { name, requests });
  },
  async importCurl(curl: string) {
    return bridgeInvoke<ApiRequest>("api_curl_import", { curl });
  },
};
