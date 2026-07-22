import { QueryTypes, type Sequelize } from "sequelize";
import { up as upRegistrationSchema } from "./migrations/001-registration-schema.js";

type Migration = {
  name: string;
  up: (sequelize: Sequelize) => Promise<void>;
};

const migrations: Migration[] = [
  {
    name: "001-registration-schema",
    up: upRegistrationSchema,
  },
];

export async function runMigrations(sequelize: Sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const migration of migrations) {
    const rows = await sequelize.query<{ name: string }>(
      "SELECT name FROM schema_migrations WHERE name = ? LIMIT 1",
      {
        replacements: [migration.name],
        type: QueryTypes.SELECT,
      },
    );

    if (rows.length > 0) {
      continue;
    }

    await migration.up(sequelize);
    await sequelize.query(
      "INSERT INTO schema_migrations (name, executed_at) VALUES (?, CURRENT_TIMESTAMP)",
      {
        replacements: [migration.name],
      },
    );
  }
}
