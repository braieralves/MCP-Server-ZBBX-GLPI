export interface ZabbixApiConfig {
  apiUrls: string[];
  authToken?: string;
  username?: string;
  password?: string;
  timeoutMs: number;
}

interface ZabbixResponse<T> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: string;
  };
}

export class ZabbixApiService {
  private cachedAuthToken?: string;

  constructor(private config: ZabbixApiConfig) {}

  async call<T = unknown>(method: string, params: unknown = {}, timeoutMs = this.config.timeoutMs): Promise<T> {
    const authToken = await this.getAuthToken(method, timeoutMs);
    const payload: Record<string, unknown> = {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now(),
    };

    return this.callFirstAvailable<T>(payload, authToken, timeoutMs);
  }

  async getVersion(timeoutMs = this.config.timeoutMs): Promise<string> {
    return this.call<string>("apiinfo.version", {}, timeoutMs);
  }

  async login(timeoutMs = this.config.timeoutMs): Promise<string> {
    if (!this.config.username || !this.config.password) {
      throw new Error("ZABBIX_USERNAME and ZABBIX_PASSWORD are required when ZABBIX_AUTH_TOKEN is not set");
    }

    const token = await this.call<string>(
      "user.login",
      {
        username: this.config.username,
        password: this.config.password,
      },
      timeoutMs
    );
    this.cachedAuthToken = token;
    return token;
  }

  private async getAuthToken(method: string, timeoutMs: number): Promise<string | undefined> {
    if (method === "apiinfo.version" || method === "user.login") {
      return undefined;
    }

    if (this.config.authToken) {
      return this.config.authToken;
    }

    if (this.cachedAuthToken) {
      return this.cachedAuthToken;
    }

    if (this.config.username && this.config.password) {
      return this.login(timeoutMs);
    }

    return undefined;
  }

  private async callFirstAvailable<T>(
    payload: Record<string, unknown>,
    authToken: string | undefined,
    timeoutMs: number
  ): Promise<T> {
    const errors: string[] = [];

    for (const url of this.config.apiUrls) {
      try {
        return await this.callUrl<T>(url, payload, authToken, timeoutMs);
      } catch (error) {
        errors.push(`${url}: ${error instanceof Error ? error.message : "Unknown Zabbix API error"}`);
      }
    }

    throw new Error(`All Zabbix API endpoints failed. ${errors.join("; ")}`);
  }

  private async callUrl<T>(
    url: string,
    payload: Record<string, unknown>,
    authToken: string | undefined,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json-rpc",
      };

      if (authToken) {
        headers.Authorization = "Bearer " + authToken;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ZabbixResponse<T>;
      if (data.error) {
        throw new Error(`${data.error.message}${data.error.data ? `: ${data.error.data}` : ""}`);
      }

      return data.result as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
