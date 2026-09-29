import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MonitoringService } from "./application/services/MonitoringService.js";
import { MonitorConfig } from "./domain/models/Monitoring.js";
import { GlpiApiService } from "./infrastructure/services/GlpiApiService.js";
import { NetworkMonitoringService } from "./infrastructure/services/NetworkMonitoringService.js";
import { ZabbixApiService } from "./infrastructure/services/ZabbixApiService.js";
import { ApiToolsController } from "./interface/controllers/ApiToolsController.js";
import { MonitoringToolsController } from "./interface/controllers/MonitoringToolsController.js";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function readPorts(name: string, fallback: number[]): number[] {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const ports = value.split(",").map((port) => Number(port.trim()));
  if (ports.length === 0 || ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error(`${name} must be a comma-separated list of TCP ports`);
  }

  return ports;
}

function readGlpiPorts(): number[] {
  if (process.env.GLPI_PORTS) {
    return readPorts("GLPI_PORTS", [80]);
  }

  return readPorts("LPI_PORTS", [80]);
}

function readConfig(): MonitorConfig {
  const zabbixUrl = trimTrailingSlash(process.env.ZABBIX_URL ?? "http://172.17.0.4");
  const zabbixApiUrl = process.env.ZABBIX_API_URL;
  const glpiUrl = trimTrailingSlash(process.env.GLPI_URL ?? process.env.LPI_URL ?? "http://172.17.0.7");
  const glpiApiUrl = trimTrailingSlash(process.env.GLPI_API_URL ?? `${glpiUrl}/apirest.php`);

  return {
    zabbixHost: process.env.ZABBIX_HOST ?? "172.17.0.4",
    zabbixUrl,
    zabbixApiUrls: zabbixApiUrl
      ? [zabbixApiUrl]
      : [`${zabbixUrl}/api_jsonrpc.php`, `${zabbixUrl}/zabbix/api_jsonrpc.php`],
    zabbixAuthToken: process.env.ZABBIX_AUTH_TOKEN,
    zabbixUsername: process.env.ZABBIX_USERNAME,
    zabbixPassword: process.env.ZABBIX_PASSWORD,
    zabbixServerPort: readNumber("ZABBIX_SERVER_PORT", 10051),
    glpiHost: process.env.GLPI_HOST ?? process.env.LPI_HOST ?? "172.17.0.7",
    glpiUrl,
    glpiApiUrl,
    glpiPorts: readGlpiPorts(),
    glpiAppToken: process.env.GLPI_APP_TOKEN,
    glpiUserToken: process.env.GLPI_USER_TOKEN,
    glpiSessionToken: process.env.GLPI_SESSION_TOKEN,
    glpiUsername: process.env.GLPI_USERNAME,
    glpiPassword: process.env.GLPI_PASSWORD,
    timeoutMs: readNumber("MONITOR_TIMEOUT_MS", 3000),
  };
}

async function main() {
  const server = new McpServer({
    name: "zabbix-glpi-mcp",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  const networkMonitoringService = new NetworkMonitoringService();
  const config = readConfig();
  const monitoringService = new MonitoringService(networkMonitoringService, config);
  const zabbixApiService = new ZabbixApiService({
    apiUrls: config.zabbixApiUrls,
    authToken: config.zabbixAuthToken,
    username: config.zabbixUsername,
    password: config.zabbixPassword,
    timeoutMs: config.timeoutMs,
  });
  const glpiApiService = new GlpiApiService({
    apiUrl: config.glpiApiUrl,
    appToken: config.glpiAppToken,
    userToken: config.glpiUserToken,
    sessionToken: config.glpiSessionToken,
    username: config.glpiUsername,
    password: config.glpiPassword,
    timeoutMs: config.timeoutMs,
  });

  new MonitoringToolsController(server, monitoringService);
  new ApiToolsController(server, zabbixApiService, glpiApiService);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Zabbix/GLPI MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
