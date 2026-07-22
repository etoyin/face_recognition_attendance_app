import { runMigrations } from "./migrator.js";
import { initializeModels } from "./models/index.js";
import { getSequelize } from "./sequelize.js";
let bootstrapped = false;
export async function bootstrapDatabase() {
    if (bootstrapped) {
        return getSequelize();
    }
    const sequelize = getSequelize();
    await sequelize.authenticate();
    await runMigrations(sequelize);
    initializeModels(sequelize);
    bootstrapped = true;
    return sequelize;
}
