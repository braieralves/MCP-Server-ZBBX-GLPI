import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MonitoringService } from "../../application/services/MonitoringService.js";

const timeoutSchema = z
  .number()
  .int()
  .min(500)
  .max(30000)
  .optional()
  .describe("Timeout per check in milliseconds. Default: 3000.");

export class MonitoringToolsController {
  constructor(
    private server: McpServer,
    private monitoringService: MonitoringService
  ) {
    this.registerTools();
  }

  private registerTools(): void {
    this.registerCheckZabbixTool();
    this.registerCheckGlpiTool();
    this.registerCheckLpiCompatibilityTool();
    this.registerCheckAllTool();
    this.registerCheckHostTool();
  }

  private registerCheckZabbixTool(): void {
    this.server.tool(
      "check-zabbix",
      "Check the Zabbix server at 172.17.0.4, including web UI, API, and server TCP port.",
      {
        timeoutMs: timeoutSchema,
      },
      async ({ timeoutMs }) => {
        const report = await this.monitoringService.checkZabbix(timeoutMs);

        return {
          content: [
            {
              type: "text",
              text: this.monitoringService.formatReport(report),
            },
          ],
        };
      }
    );
  }

  private registerCheckGlpiTool(): void {
    this.server.tool(
      "check-glpi",
      "Check the GLPI host at 172.17.0.7 using HTTP and configured TCP ports.",
      {
        ports: z
          .array(z.number().int().min(1).max(65535))
          .optional()
          .describe("TCP ports to check on the GLPI host. Default comes from GLPI_PORTS or 80."),
        timeoutMs: timeoutSchema,
      },
      async ({ ports, timeoutMs }) => {
        const report = await this.monitoringService.checkGlpi(ports, timeoutMs);

        return {
          content: [
            {
              type: "text",
              text: this.monitoringService.formatReport(report),
            },
          ],
        };
      }
    );
  }

  private registerCheckLpiCompatibilityTool(): void {
    this.server.tool(
      "check-lpi",
      "Compatibility alias for check-glpi.",
      {
        ports: z.array(z.number().int().min(1).max(65535)).optional(),
        timeoutMs: timeoutSchema,
      },
      async ({ ports, timeoutMs }) => {
        const report = await this.monitoringService.checkGlpi(ports, timeoutMs);

        return {
          content: [
            {
              type: "text",
              text: this.monitoringService.formatReport(report),
            },
          ],
        };
      }
    );
  }

  private registerCheckAllTool(): void {
    this.server.tool(
      "check-all",
      "Check both monitored targets: Zabbix at 172.17.0.4 and GLPI at 172.17.0.7.",
      {
        timeoutMs: timeoutSchema,
      },
      async ({ timeoutMs }) => {
        const reports = await this.monitoringService.checkAll(timeoutMs);

        return {
          content: [
            {
              type: "text",
              text: this.monitoringService.formatReports(reports),
            },
          ],
        };
      }
    );
  }

  private registerCheckHostTool(): void {
    this.server.tool(
      "check-host",
      "Check arbitrary TCP ports on a host.",
      {
        host: z.string().min(1).describe("IP address or hostname to check."),
        ports: z
          .array(z.number().int().min(1).max(65535))
          .min(1)
          .describe("TCP ports to check."),
        timeoutMs: timeoutSchema,
      },
      async ({ host, ports, timeoutMs }) => {
        const report = await this.monitoringService.checkHost(host, ports, timeoutMs);

        return {
          content: [
            {
              type: "text",
              text: this.monitoringService.formatReport(report),
            },
          ],
        };
      }
    );
  }
}
