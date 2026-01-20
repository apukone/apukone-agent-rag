
import * as lancedb from 'vectordb';
import ollama from 'ollama';
import fs from 'fs';
import path from 'path';

const DB_PATH = 'data/lancedb';

export interface Document {
    id: string;
    text: string;
    source: string;
    vector: number[];
}

export class VectorStore {
    private db: lancedb.Connection | null = null;
    private table: lancedb.Table | null = null;

    async connect() {
        if (this.db) return;
        this.db = await lancedb.connect(DB_PATH);
        try {
            this.table = await this.db.openTable('knowledge');
        } catch (e) {
            console.log("Table 'knowledge' not found. It will be created during ingestion.");
        }
    }

    async createTable(data: any[]) {
        this.db = await lancedb.connect(DB_PATH);
        try {
            await this.db.dropTable('knowledge');
        } catch { } // Ignore if not exists

        this.table = await this.db.createTable('knowledge', data);
        console.log(`Created table with ${data.length} entries.`);
    }

    async search(query: string, limit = 3): Promise<Document[]> {
        await this.connect();
        if (!this.table) {
            console.warn("Table not found during search.");
            return [];
        }

        const embedding = await this.getEmbedding(query);
        const results = await this.table.search(embedding).limit(limit).execute();

        // Map results ensuring they match Document interface
        return results.map((r: any) => ({
            id: r.id,
            text: r.text,
            source: r.source,
            vector: [] // We don't need to return the vector
        }));
    }

    async getEmbedding(text: string): Promise<number[]> {
        const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
        try {
            const response = await ollama.embeddings({
                model: model,
                prompt: text
            });
            return response.embedding;
        } catch (error) {
            console.error(`Error generating embedding with model ${model}:`, error);
            throw error;
        }
    }
}
