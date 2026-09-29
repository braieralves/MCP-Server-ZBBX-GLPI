import {
  CheckResult,
  MonitorConfig,
  TargetReport,
  TargetStatus,
} from "../../domain/models/Monitoring.js";
import { NetworkMonitoringService } from "../../infrastructure/services/NetworkMonitoringService.js";

export class MonitoringService {
  constructor(
    private networkService: NetworkMonitoringService,
    private config: MonitorConfig
  ) {}

  async checkZabbix(timeoutMs = this.config.timeoutMs): Promise<TargetReport> {
    const checks = await Promise.all([
      this.networkService.checkHttp(
        {
          name: "zabbix-web",
          url: this.config.zabbixUrl,
        },
        timeoutMs
      ),
      this.networkService.checkZabbixApi(this.config.zabbixApiUrls, timeoutMs),
      this.networkService.checkTcp(
        {
          name: "zabbix-server",
          host: this.config.zabbixHost,
          port: this.config.zabbixServerPort,
        },
        timeoutMs
      ),
    ]);

    return this.buildReport("zabbix", checks);
  }

  async checkGlpi(ports = this.config.glpiPorts, timeoutMs = this.config.timeoutMs): Promise<TargetReport> {
    const checks = await Promise.all([
      this.networkService.checkHttp(
        {
          name: "glpi-web",
          url: this.config.glpiUrl,
        },
        timeoutMs
      ),
      this.networkService.checkHttp(
        {
          name: "glpi-api",
          url: `${this.config.glpiApiUrl}/initSession`,
          acceptedStatusCodes: [400, 401],
        },
        timeoutMs
      ),
      ...ports.map((port) =>
        this.networkService.checkTcp(
          {
            name: `glpi-port-${port}`,
            host: this.config.glpiHost,
            port,
          },
          timeoutMs
        )
      ),
    ]);

    return this.buildReport("glpi", checks);
  }

  async checkLpi(ports = this.config.glpiPorts, timeoutMs = this.config.timeoutMs): Promise<TargetReport> {
    return this.checkGlpi(ports, timeoutMs);
  }

  async checkHost(host: string, ports: number[], timeoutMs = this.config.timeoutMs): Promise<TargetReport> {
    const checks = await Promise.all(
      ports.map((port) =>
        this.networkService.checkTcp(
          {
            name: `tcp-${port}`,
            host,
            port,
          },
          timeoutMs
        )
      )
    );

    return this.buildReport(host, checks);
  }

  async checkAll(timeoutMs = this.config.timeoutMs): Promise<TargetReport[]> {
    return Promise.all([this.checkZabbix(timeoutMs), this.checkGlpi(undefined, timeoutMs)]);
  }

  formatReport(report: TargetReport): string {
    const lines = [
      `Target: ${report.target}`,
      `Status: ${report.status.toUpperCase()}`,
      `Checked at: ${report.checkedAt}`,
      "",
      ...report.checks.map((check) => this.formatCheck(check)),
    ];

    return lines.join("\n");
  }

  formatReports(reports: TargetReport[]): string {
    return reports.map((report) => this.formatReport(report)).join("\n\n");
  }

  private buildReport(target: string, checks: CheckResult[]): TargetReport {
    return {
      target,
      status: this.getTargetStatus(checks),
      checkedAt: new Date().toISOString(),
      checks,
    };
  }

  private getTargetStatus(checks: CheckResult[]): TargetStatus {
    const upChecks = checks.filter((check) => check.status === "up").length;

    if (upChecks === checks.length) {
      return "up";
    }

    return upChecks > 0 ? "degraded" : "down";
  }

  private formatCheck(check: CheckResult): string {
    const status = check.status.toUpperCase();
    const suffix = check.error ? ` - ${check.error}` : check.details ? ` - ${check.details}` : "";

    return `[${status}] ${check.name} (${check.endpoint}) ${check.latencyMs}ms${suffix}`;
  }
}
