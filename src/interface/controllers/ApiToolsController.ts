import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GlpiApiService, GlpiHttpMethod } from "../../infrastructure/services/GlpiApiService.js";
import { ZabbixApiService } from "../../infrastructure/services/ZabbixApiService.js";

const timeoutSchema = z
  .number()
  .int()
  .min(500)
  .max(120000)
  .optional()
  .describe("Timeout for the API call in milliseconds. Default comes from MONITOR_TIMEOUT_MS.");

const jsonValueSchema = z.any().optional().describe("JSON payload accepted by the target API.");

function toText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export class ApiToolsController {
  constructor(
    private server: McpServer,
    private zabbixApiService: ZabbixApiService,
    private glpiApiService: GlpiApiService
  ) {
    this.registerTools();
  }

  private registerTools(): void {
    this.registerZabbixApiCallTool();
    this.registerZabbixApiVersionTool();
    this.registerGlpiRequestTool();
    this.registerGlpiGetItemTool();
    this.registerGlpiSearchTool();
    this.registerGlpiCreateItemTool();
    this.registerGlpiUpdateItemTool();
    this.registerGlpiDeleteItemTool();
  }

  private registerZabbixApiCallTool(): void {
    this.server.tool(
      "zabbix-api-call",
      "Call any Zabbix JSON-RPC API method. Use this for reads and writes such as host.get, item.get, trigger.get, problem.get, host.create, item.create, and maintenance.create.",
      {
        method: z.string().min(1).describe("Zabbix API method, for example host.get or host.create."),
        params: jsonValueSchema,
        timeoutMs: timeoutSchema,
      },
      async ({ method, params, timeoutMs }) => {
        const result = await this.zabbixApiService.call(method, params ?? {}, timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }

  private registerZabbixApiVersionTool(): void {
    this.server.tool(
      "zabbix-api-version",
      "Return the Zabbix API version.",
      {
        timeoutMs: timeoutSchema,
      },
      async ({ timeoutMs }) => {
        const result = await this.zabbixApiService.getVersion(timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      }
    );
  }

  private registerGlpiRequestTool(): void {
    this.server.tool(
      "glpi-request",
      "Call any GLPI REST API path. Use this for complete read/write access to GLPI endpoints.",
      {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method."),
        path: z.string().min(1).describe("GLPI API path, for example /Computer/1, /Ticket, or /search/Ticket."),
        body: jsonValueSchema,
        timeoutMs: timeoutSchema,
      },
      async ({ method, path, body, timeoutMs }) => {
        const result = await this.glpiApiService.request(path, method as GlpiHttpMethod, body, timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }

  private registerGlpiGetItemTool(): void {
    this.server.tool(
      "glpi-get-item",
      "Read a GLPI item by item type and numeric ID.",
      {
        itemType: z.string().min(1).describe("GLPI item type, for example Computer, Ticket, User, Entity, or NetworkEquipment."),
        id: z.number().int().positive().describe("GLPI item ID."),
        timeoutMs: timeoutSchema,
      },
      async ({ itemType, id, timeoutMs }) => {
        const result = await this.glpiApiService.getItem(itemType, id, timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }

  private registerGlpiSearchTool(): void {
    this.server.tool(
      "glpi-search",
      "Search GLPI items with an arbitrary GLPI search query string.",
      {
        itemType: z.string().min(1).describe("GLPI item type, for example Computer, Ticket, User, Entity, or NetworkEquipment."),
        query: z
          .string()
          .optional()
          .describe("Raw query string after /search/{itemType}, for example forcedisplay[0]=2&range=0-49."),
        timeoutMs: timeoutSchema,
      },
      async ({ itemType, query, timeoutMs }) => {
        const result = await this.glpiApiService.search(itemType, query ?? "", timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }

  private registerGlpiCreateItemTool(): void {
    this.server.tool(
      "glpi-create-item",
      "Create a GLPI item. The input object is sent as GLPI's input payload.",
      {
        itemType: z.string().min(1).describe("GLPI item type, for example Ticket, Computer, User, or NetworkEquipment."),
        input: z.any().describe("GLPI input object."),
        timeoutMs: timeoutSchema,
      },
      async ({ itemType, input, timeoutMs }) => {
        const result = await this.glpiApiService.createItem(itemType, input, timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }

  private registerGlpiUpdateItemTool(): void {
    this.server.tool(
      "glpi-update-item",
      "Update a GLPI item. The input object is sent as GLPI's input payload.",
      {
        itemType: z.string().min(1).describe("GLPI item type, for example Ticket, Computer, User, or NetworkEquipment."),
        id: z.number().int().positive().describe("GLPI item ID."),
        input: z.any().describe("GLPI input object."),
        timeoutMs: timeoutSchema,
      },
      async ({ itemType, id, input, timeoutMs }) => {
        const result = await this.glpiApiService.updateItem(itemType, id, input, timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }

  private registerGlpiDeleteItemTool(): void {
    this.server.tool(
      "glpi-delete-item",
      "Delete a GLPI item by item type and ID.",
      {
        itemType: z.string().min(1).describe("GLPI item type, for example Ticket, Computer, User, or NetworkEquipment."),
        id: z.number().int().positive().describe("GLPI item ID."),
        forcePurge: z.boolean().optional().describe("Permanently purge the item when supported by GLPI."),
        timeoutMs: timeoutSchema,
      },
      async ({ itemType, id, forcePurge, timeoutMs }) => {
        const result = await this.glpiApiService.deleteItem(itemType, id, forcePurge ?? false, timeoutMs);
        return {
          content: [
            {
              type: "text",
              text: toText(result),
            },
          ],
        };
      }
    );
  }
}
