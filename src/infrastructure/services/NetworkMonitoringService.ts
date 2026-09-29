import net from "node:net";
import { CheckResult, HttpCheckDefinition, TcpCheckDefinition } from "../../domain/models/Monitoring.js";

export class NetworkMonitoringService {
  async checkTcp(definition: TcpCheckDefinition, timeoutMs: number): Promise<CheckResult> {
    const startedAt = Date.now();
    const endpoint = `${definition.host}:${definition.port}`;

    return new Promise((resolve) => {
      const socket = net.createConnection({
        host: definition.host,
        port: definition.port,
        timeout: timeoutMs,
      });

      const finish = (status: "up" | "down", details?: string, error?: string) => {
        socket.destroy();
        resolve({
          name: definition.name,
          type: "tcp",
          status,
          latencyMs: Date.now() - startedAt,
          endpoint,
          details,
          error,
        });
      };

      socket.once("connect", () => finish("up", "TCP connection accepted"));
      socket.once("timeout", () => finish("down", undefined, `Timed out after ${timeoutMs}ms`));
      socket.once("error", (error) => finish("down", undefined, error.message));
    });
  }

  async checkHttp(definition: HttpCheckDefinition, timeoutMs: number): Promise<CheckResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(definition.url, {
        method: definition.method ?? "GET",
        headers: definition.headers,
        body: definition.body ? JSON.stringify(definition.body) : undefined,
        signal: controller.signal,
      });

      const isAccepted =
        (response.status >= 200 && response.status < 400) ||
        definition.acceptedStatusCodes?.includes(response.status) === true;
      const status = isAccepted ? "up" : "down";
      return {
        name: definition.name,
        type: "http",
        status,
        latencyMs: Date.now() - startedAt,
        endpoint: definition.url,
        details: `HTTP ${response.status} ${response.statusText}`,
        error: status === "down" ? `Unexpected HTTP status ${response.status}` : undefined,
      };
    } catch (error) {
      return {
        name: definition.name,
        type: "http",
        status: "down",
        latencyMs: Date.now() - startedAt,
        endpoint: definition.url,
        error: error instanceof Error ? error.message : "Unknown HTTP error",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkZabbixApi(apiUrls: string[], timeoutMs: number): Promise<CheckResult> {
    if (apiUrls.length === 0) {
      return {
        name: "zabbix-api",
        type: "zabbix-api",
        status: "down",
        latencyMs: 0,
        endpoint: "not configured",
        error: "No Zabbix API URL configured",
      };
    }

    const results: CheckResult[] = [];

    for (const url of apiUrls) {
      const result = await this.checkJsonRpcApiInfo(url, timeoutMs);
      if (result.status === "up") {
        return result;
      }
      results.push(result);
    }

    const firstResult = results[0] ?? {
      name: "zabbix-api",
      type: "zabbix-api" as const,
      status: "down" as const,
      latencyMs: 0,
      endpoint: "not configured",
      error: "No Zabbix API URL configured",
    };

    return {
      ...firstResult,
      error: results.map((result) => `${result.endpoint}: ${result.error ?? result.details}`).join("; "),
    };
  }

  private async checkJsonRpcApiInfo(url: string, timeoutMs: number): Promise<CheckResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json-rpc",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "apiinfo.version",
          params: {},
          id: 1,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          name: "zabbix-api",
          type: "zabbix-api",
          status: "down",
          latencyMs: Date.now() - startedAt,
          endpoint: url,
          details: `HTTP ${response.status} ${response.statusText}`,
          error: `Unexpected HTTP status ${response.status}`,
        };
      }

      const payload = (await response.json()) as { result?: unknown; error?: { message?: string } };
      if (typeof payload.result === "string") {
        return {
          name: "zabbix-api",
          type: "zabbix-api",
          status: "up",
          latencyMs: Date.now() - startedAt,
          endpoint: url,
          details: `Zabbix API version ${payload.result}`,
        };
      }

      return {
        name: "zabbix-api",
        type: "zabbix-api",
        status: "down",
        latencyMs: Date.now() - startedAt,
        endpoint: url,
        error: payload.error?.message ?? "Zabbix API did not return apiinfo.version",
      };
    } catch (error) {
      return {
        name: "zabbix-api",
        type: "zabbix-api",
        status: "down",
        latencyMs: Date.now() - startedAt,
        endpoint: url,
        error: error instanceof Error ? error.message : "Unknown Zabbix API error",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
