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

export async function getUserLLAC(userId: string): Promise<string | null> {
    const res = await sql<{ llac: string }[]>`SELECT llac FROM access_tokens WHERE user_id = ${userId}`;

    if (res.length === 0) return null;
    else return res[0]!.llac
}

export async function setUserLLAC(userId: string, llac: string): Promise<void> {
    await sql`INSERT INTO access_tokens(user_id, llac)
    VALUES (${userId}, ${llac})
    ON CONFLICT (user_id)
    DO UPDATE SET llac = EXCLUDED.llac`
}

export async function getThreadMapping(threadId: string): Promise<string | null> {
    const res = await sql<{ conversation_id: string }[]>`SELECT conversation_id FROM thread_mappings WHERE thread_id = ${threadId}`;

    if (res.length === 0) return null;
    else return res[0]!.conversation_id
}

export async function setThreadMapping(threadId: string, conversationId: string): Promise<void> {
    await sql`INSERT INTO thread_mappings(thread_id, conversation_id)
    VALUES (${threadId}, ${conversationId})
    ON CONFLICT (thread_id)
    DO NOTHING`
}