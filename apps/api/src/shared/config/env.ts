import dotenv from "dotenv";

dotenv.config();

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function parseClientUrls() {
  const rawValue =
    process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "http://localhost:3000";

  return rawValue
    .split(",")
    .map((item) => normalizeUrl(item))
    .filter(Boolean);
}

const port = Number(process.env.PORT ?? 4000);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port,
  clientUrls: parseClientUrls(),
  publicApiUrl: normalizeUrl(
    process.env.PUBLIC_API_URL ?? `http://localhost:${port}`,
  ),
  uploadTtlHours: Number(process.env.UPLOAD_TTL_HOURS ?? 24),
  dbHost: process.env.DB_HOST ?? "127.0.0.1",
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbName: process.env.DB_NAME ?? "church_attendance",
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "",
  dbLogging: process.env.DB_LOGGING === "true",
};
