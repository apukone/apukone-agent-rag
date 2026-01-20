
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ApukoneClient } from '@apukone/client';
// @ts-ignore
import ollama from 'ollama';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize MCP Client
const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', path.join(__dirname, 'server.ts')],
});

const client = new Client(
    {
        name: 'apukone-rag-agent',
        version: '1.0.0',
    },
    {
        capabilities: {},
    }
);

// Connect to MCP Server
await client.connect(transport);
console.log('MCP Client connected to RAG server');

// Get available tools
const toolsResult = await client.listTools();
const tools = toolsResult.tools.map((tool) => ({
    type: 'function',
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
    },
}));

console.log(`Loaded ${tools.length} tools`);

const SYSTEM_PROMPT = `You are a helper agent for the Apukone platform. You have access to a knowledge base via the 'search_knowledge' tool. 
ALWAYS use the 'search_knowledge' tool if the user asks about specific details, facts, or policies regarding Apukone or the topics covered in your knowledge base.
Do not hallucinate. If you find no information, state that.`;

// Helper to process messages
const processMessage = async (messages: any[]): Promise<any> => {
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:14b';

    let currentMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
    ];

    let response = await ollama.chat({
        model: model,
        messages: currentMessages,
        tools: tools,
    });

    while (response.message.tool_calls && response.message.tool_calls.length > 0) {
        currentMessages.push(response.message);

        for (const toolCall of response.message.tool_calls) {
            console.log(`Executing tool: ${toolCall.function.name}`);

            try {
                const result = await client.callTool({
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments,
                });

                const toolContent = (result.content as any[])
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text)
                    .join('\n');

                currentMessages.push({
                    role: 'tool',
                    content: toolContent,
                });
            } catch (error) {
                console.error(`Error executing tool ${toolCall.function.name}:`, error);
                currentMessages.push({
                    role: 'tool',
                    content: `Error executing tool: ${error}`,
                });
            }
        }

        response = await ollama.chat({
            model: model,
            messages: currentMessages,
            tools: tools,
        });
    }

    return {
        ...response.message,
        eval_count: response.eval_count
    };
};

const onMessage = async (data: any[]) => {
    try {
        console.log('Received message from Apukone');
        const response = await processMessage(data);
        return response;
    } catch (error) {
        console.error('Error processing message:', error);
        return "I encountered an error trying to process your request.";
    }
};

ApukoneClient({
    host: process.env.HOST || 'http://localhost:8081',
    token: process.env.TOKEN || 'rag-agent-token',
    onMessage: onMessage,
});

console.log('Apukone RAG Agent started');
