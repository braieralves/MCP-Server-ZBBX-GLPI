export type GlpiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface GlpiApiConfig {
  apiUrl: string;
  appToken?: string;
  userToken?: string;
  sessionToken?: string;
  username?: string;
  password?: string;
  timeoutMs: number;
}

export class GlpiApiService {
  private cachedSessionToken?: string;

  constructor(private config: GlpiApiConfig) {}

  async initSession(timeoutMs = this.config.timeoutMs): Promise<string> {
    if (this.config.sessionToken) {
      return this.config.sessionToken;
    }

    if (this.cachedSessionToken) {
      return this.cachedSessionToken;
    }

    const headers = this.buildAuthHeaders(false);
    const response = await this.fetchJson<{ session_token?: string }>("/initSession", "GET", undefined, headers, timeoutMs);
    if (!response.session_token) {
      throw new Error("GLPI initSession did not return session_token");
    }

    this.cachedSessionToken = response.session_token;
    return response.session_token;
  }

  async request<T = unknown>(
    path: string,
    method: GlpiHttpMethod = "GET",
    body?: unknown,
    timeoutMs = this.config.timeoutMs
  ): Promise<T> {
    const sessionToken = await this.initSession(timeoutMs);
    const headers = this.buildAuthHeaders(true, sessionToken);
    return this.fetchJson<T>(path, method, body, headers, timeoutMs);
  }

  async getItem(itemType: string, id: number, timeoutMs = this.config.timeoutMs): Promise<unknown> {
    return this.request(`/${encodeURIComponent(itemType)}/${id}`, "GET", undefined, timeoutMs);
  }

  async search(itemType: string, query = "", timeoutMs = this.config.timeoutMs): Promise<unknown> {
    const suffix = query ? `?${query.replace(/^\?/, "")}` : "";
    return this.request(`/search/${encodeURIComponent(itemType)}${suffix}`, "GET", undefined, timeoutMs);
  }

  async createItem(itemType: string, input: unknown, timeoutMs = this.config.timeoutMs): Promise<unknown> {
    return this.request(`/${encodeURIComponent(itemType)}`, "POST", { input }, timeoutMs);
  }

  async updateItem(itemType: string, id: number, input: unknown, timeoutMs = this.config.timeoutMs): Promise<unknown> {
    return this.request(`/${encodeURIComponent(itemType)}/${id}`, "PUT", { input }, timeoutMs);
  }

  async deleteItem(itemType: string, id: number, forcePurge = false, timeoutMs = this.config.timeoutMs): Promise<unknown> {
    const suffix = forcePurge ? "?force_purge=true" : "";
    return this.request(`/${encodeURIComponent(itemType)}/${id}${suffix}`, "DELETE", undefined, timeoutMs);
  }

  private buildAuthHeaders(includeSession: boolean, sessionToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.appToken) {
      headers["App-Token"] = this.config.appToken;
    }

    if (includeSession) {
      headers["Session-Token"] = sessionToken ?? this.config.sessionToken ?? "";
      return headers;
    }

    if (this.config.userToken) {
      headers.Authorization = `user_token ${this.config.userToken}`;
      return headers;
    }

    if (this.config.username && this.config.password) {
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
      headers.Authorization = `Basic ${credentials}`;
      return headers;
    }

    throw new Error("GLPI_USER_TOKEN or GLPI_USERNAME/GLPI_PASSWORD is required when GLPI_SESSION_TOKEN is not set");
  }

  private async fetchJson<T>(
    path: string,
    method: GlpiHttpMethod,
    body: unknown,
    headers: Record<string, string>,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${this.config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      const data = text ? (JSON.parse(text) as T) : ({} as T);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }
}
