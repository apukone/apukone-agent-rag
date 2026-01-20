
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VectorStore } from "./vector-store.js";

const store = new VectorStore();

const server = new Server(
    {
        name: "apukone-rag-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_knowledge",
                description: "Search the internal knowledge base for information about Apukone agents, policies, or other documents.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to find relevant information."
                        }
                    },
                    required: ["query"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "search_knowledge") {
        const { query } = request.params.arguments as any;
        console.error(`Searching for: ${query}`);

        try {
            const results = await store.search(query);
            const content = results.map(r => `[Source: ${r.source}]\n${r.text}`).join("\n\n---\n\n");

            return {
                content: [
                    {
                        type: "text",
                        text: content || "No relevant information found."
                    }
                ]
            };
        } catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: `Error searching knowledge base: ${e}` }]
            };
        }
    }

    throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
