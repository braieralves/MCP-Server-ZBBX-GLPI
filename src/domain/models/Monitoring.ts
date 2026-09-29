export type CheckStatus = "up" | "down";

export type TargetStatus = "up" | "degraded" | "down";

export interface TcpCheckDefinition {
  name: string;
  host: string;
  port: number;
}

export interface HttpCheckDefinition {
  name: string;
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  acceptedStatusCodes?: number[];
}

export interface CheckResult {
  name: string;
  type: "tcp" | "http" | "zabbix-api" | "glpi-api";
  status: CheckStatus;
  latencyMs: number;
  endpoint: string;
  details?: string;
  error?: string;
}

export interface TargetReport {
  target: string;
  status: TargetStatus;
  checkedAt: string;
  checks: CheckResult[];
}

export interface MonitorConfig {
  zabbixHost: string;
  zabbixUrl: string;
  zabbixApiUrls: string[];
  zabbixAuthToken?: string;
  zabbixUsername?: string;
  zabbixPassword?: string;
  zabbixServerPort: number;
  glpiHost: string;
  glpiUrl: string;
  glpiApiUrl: string;
  glpiPorts: number[];
  glpiAppToken?: string;
  glpiUserToken?: string;
  glpiSessionToken?: string;
  glpiUsername?: string;
  glpiPassword?: string;
  timeoutMs: number;
}
