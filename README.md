# Apukone RAG Agent

A Retrieval-Augmented Generation (RAG) agent for the Apukone platform. This agent uses local documents to answer user queries, leveraging Ollama for inference and embeddings, and LanceDB for vector storage.

## Requirements

- **Node.js**: v18 or higher
- **Ollama**: Running locally (default URL: `http://localhost:11434`)

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Copy `.env.example` or create a `.env` file with:
    ```properties
    HOST=http://localhost:8081
    TOKEN=your-agent-token
    OLLAMA_MODEL=qwen3:8b
    OLLAMA_EMBED_MODEL=nomic-embed-text
    ```

3.  **Pull Ollama Models**:
    Ensure you have the configured models installed:
    ```bash
    ollama pull qwen3:8b
    ollama pull nomic-embed-text
    ```

## Usage

### 1. Ingest Knowledge Base
Place your markdown or text documents in `data/documents/`. The agent comes with an `intro.md` sample.

To process these documents and build the vector store:

```bash
npm run ingest
```

This will create a `data/lancedb` directory with the vector embeddings.

### 2. Start the Agent
Run the agent to connect it to the Apukone backend:

```bash
npm start
```

### 3. Chat
In the Apukone UI, select the RAG Agent and ask questions related to your ingested documents. The agent will use the `search_knowledge` tool to retrieve relevant information before answering.

## Project Structure

- `src/index.ts`: Main agent logic (Apukone Client + Ollama Loop).
- `src/server.ts`: MCP Server defining the `search_knowledge` tool.
- `src/vector-store.ts`: Wrapper for LanceDB operations.
- `src/ingest.ts`: Script to ingest documents.
- `data/documents/`: Directory for source documents.
- `data/lancedb/`: Generated vector store (do not commit).
