import "dotenv/config";
import { createPool } from "mysql2/promise";

/**
 * The official database connection pool.
 */
export const officialDb = createPool({
    user: process.env.OFFICIAL_DB_USERNAME,
    host: process.env.OFFICIAL_DB_HOSTNAME,
    database: process.env.OFFICIAL_DB_NAME,
    password: process.env.OFFICIAL_DB_PASSWORD,
    port: parseInt(process.env.OFFICIAL_DB_PORT ?? "") || undefined,
    namedPlaceholders: true,
});
