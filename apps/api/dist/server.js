import { createApp } from "./app.js";
import { env } from "./shared/config/env.js";
import { bootstrapDatabase } from "./shared/database/bootstrap.js";
async function startServer() {
    await bootstrapDatabase();
    const app = createApp();
    app.listen(env.port, env.host, () => {
        console.log(`Member registration API listening on ${env.publicApiUrl}`);
    });
}
startServer().catch((error) => {
    console.error("Failed to start API server", error);
    process.exit(1);
});
