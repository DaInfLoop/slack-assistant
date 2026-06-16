import postgres from "postgres";
import type { Installation, InstallationStore } from "@slack/bolt";

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
            instance_uri TEXT NOT NULL,
            llac TEXT NOT NULL
        )`,
        s`CREATE TABLE IF NOT EXISTS thread_mappings (
            thread_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL
        )`,
        s`CREATE TABLE IF NOT EXISTS installations (
            target_id TEXT PRIMARY KEY,
            installation JSONB NOT NULL
        )`
    ])
}

type UserInfo = {
    instanceUri: string,
    llac: string
}

const userCache = new Map<string, UserInfo>();
const threadMappingCache = new Map<string, string>();

export async function getUserInfo(userId: string): Promise<UserInfo | null> {
    const cached = userCache.get(userId);
    if (cached !== undefined) return cached;

    const res = await sql<{ instance_uri: string, llac: string }[]>`SELECT llac, instance_uri FROM access_tokens WHERE user_id = ${userId}`;

    if (res.length === 0) return null;
    else {
        userCache.set(userId, {
            instanceUri: res[0]!.instance_uri,
            llac: res[0]!.llac
        })
        return {
            instanceUri: res[0]!.instance_uri,
            llac: res[0]!.llac
        }
    }
}

export async function setUserInfo(userId: string, userInfo: UserInfo): Promise<void> {
    await sql`INSERT INTO access_tokens(user_id, instance_uri, llac)
    VALUES (${userId}, ${userInfo.instanceUri}, ${userInfo.llac})
    ON CONFLICT (user_id)
    DO UPDATE SET instance_uri = EXCLUDED.instance_uri, llac = EXCLUDED.llac`;

    userCache.set(userId, userInfo)
}

export async function getThreadMapping(threadId: string): Promise<string | null> {
    const cached = threadMappingCache.get(threadId);
    if (cached !== undefined) return cached;

    const res = await sql<{ conversation_id: string }[]>`SELECT conversation_id FROM thread_mappings WHERE thread_id = ${threadId}`;

    if (res.length === 0) return null;
    else {
        threadMappingCache.set(threadId, res[0]!.conversation_id)
        return res[0]!.conversation_id
    }
}

export async function setThreadMapping(threadId: string, conversationId: string): Promise<void> {
    const res = await sql<{ success?: true }[]>`INSERT INTO thread_mappings(thread_id, conversation_id)
    VALUES (${threadId}, ${conversationId})
    ON CONFLICT (thread_id)
    DO NOTHING
    RETURNING TRUE as success`;

    if (res.length === 0) return;
    else {
        threadMappingCache.set(threadId, conversationId)
    }
}

export const installationStore: InstallationStore = {
    async storeInstallation(installation, logger) {
        const targetId = installation.isEnterpriseInstall ? installation.enterprise?.id : installation.team?.id;

        if (!targetId) {
            throw new Error(`Couldn't store an installation: no target ID to be found`)
        }

        if (!installation.bot) {
            throw new Error(`Couldn't store an installation: no bot installation was found`)
        }

        await sql`INSERT INTO installations(target_id, installation)
        VALUES (${targetId}, ${installation as any})
        ON CONFLICT (target_id)
        DO UPDATE SET installation = EXCLUDED.installation`;
    },

    async fetchInstallation(query, logger) {
        const targetId = query.isEnterpriseInstall ? query.enterpriseId : query.teamId;

        if (!targetId) {
            throw new Error(`Couldn't fetch an installation: no target ID to be found`)
        } 

        const installations = await sql<{ target_id: string, installation: Installation }[]>`SELECT * FROM installations
        WHERE target_id = ${targetId}`;

        if (installations.length) {
            return installations[0]!.installation;
        } else {
            throw new Error(`Couldn't fetch an installation: no installation was found`)
        }
    },

    async deleteInstallation(query, logger) {
        const targetId = query.isEnterpriseInstall ? query.enterpriseId : query.teamId;

        if (!targetId) {
            throw new Error(`Couldn't delete an installation: no target ID to be found`)
        } 

        const deletions = await sql`DELETE FROM installations
        WHERE target_id = ${targetId}`;

        if (!deletions.length) {
            throw new Error(`Couldn't delete an installation: no installation was found`)
        }            
    },
}