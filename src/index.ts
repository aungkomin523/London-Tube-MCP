import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const TFL_BASE = 'https://api.tfl.gov.uk';

type TflLine = {
    name: string;
    lineStatuses: { statusServerityDescription: string, reason?: string }[];
};

const server = new McpServer({
    name: "TFL Tube Assistant",
    version: "0.1.0"
})

server.registerTool(
    "get_line_status",
    {
        title: "Get Line Status",
        description: "Get the status of a specific London Underground line.",
        inputSchema: {
            line: z
                .string()
                .optional()
                .describe("TfL line ID in lowercase with hyphens. Omit to get every Tube line."),
        },
    },
    async ({ line }) => {
        const url = line
            ? `${TFL_BASE}/Line/${encodeURIComponent(line)}/Status`
            : `${TFL_BASE}/Line/Mode/tube/Status`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `TfL returned ${res.status}. Is '${line}' a valid line ID?` }],
                };
            }

            const lines = (await res.json()) as TflLine[];
            const summary = lines
                .map((l) => {
                    const statuses = l.lineStatuses
                        .map((s) => s.statusServerityDescription + (s.reason ? ` (${s.reason})` : ""))
                        .join("; ");
                    return `${l.name}: ${statuses}`;
                })
                .join("\n");

            return { content: [{type: "text", text: summary}]};

        } catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: `Couldn't reach TfL: ${(error as Error).message}` }],
            }
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Tube MCP server running on stdio");
