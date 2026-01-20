
import fs from 'fs';
import path from 'path';
import { VectorStore } from './vector-store.js';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const DOCS_DIR = 'data/documents';

const ingest = async () => {
    console.log("Starting ingestion...");
    const store = new VectorStore();

    // Ensure docs dir exists
    if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
        console.log(`Created absolute path: ${path.resolve(DOCS_DIR)}`);
        // Create sample doc if empty
        fs.writeFileSync(path.join(DOCS_DIR, 'sample.md'),
            "# Sample RAG Document\n\nApukone is a powerful agentic platform. It supports multiple agents like the NHL Agent and Weather Agent.\n\nThe new RAG agent demonstrates how to use local documents for knowledge.");
        console.log("Created sample.md");
    }

    const files = fs.readdirSync(DOCS_DIR);
    const data = [];

    console.log(`Found ${files.length} files.`);

    for (const file of files) {
        if (file.startsWith('.')) continue; // skip hidden

        const filePath = path.join(DOCS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Simple chunking by paragraph or fixed size
        // For simplicity, let's chunk by double newlines (paragraphs)
        const chunks = content.split(/\n\n+/);

        for (const chunk of chunks) {
            if (chunk.trim().length < 10) continue; // skip too small

            console.log(`Embedding chunk from ${file}...`);
            const vector = await store.getEmbedding(chunk);

            data.push({
                id: uuidv4(),
                text: chunk.trim(),
                source: file,
                vector: vector
            });
        }
    }

    if (data.length > 0) {
        console.log(`Saving ${data.length} chunks to vector store...`);
        await store.createTable(data);
        console.log("Ingestion complete.");
    } else {
        console.log("No data to ingest.");
    }
};

ingest().catch(console.error);
