import postgres from "postgres";

const sql = postgres({
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD
});

export default sql;

export async function setupTables() {
    return sql.begin(s => [
        s`CREATE TABLE IF NOT EXISTS access_tokens (
            user_id TEXT PRIMARY KEY,
            llac TEXT NOT NULL
        )`,
        s`CREATE TABLE IF NOT EXISTS thread_mappings (
            thread_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL
        )`
    ])
}