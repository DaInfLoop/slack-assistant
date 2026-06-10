declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV?: 'development' | 'production' = 'development';
            PORT?: string = '3000';

            // Slack credentials
            CLIENT_ID: string;
            CLIENT_SECRET: string;
            STATE_SECRET: string;
            SIGNING_SECRET: string;

            // PostgreSQL connection credentials
            PG_HOST: string;
            PG_USER: string;
            PG_DATABASE: string;
            PG_PASSWORD: string;
        }
    }
}

export {};