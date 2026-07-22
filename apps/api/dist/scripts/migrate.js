import { bootstrapDatabase } from "../shared/database/bootstrap.js";
bootstrapDatabase()
    .then(() => {
    console.log("Database migrations completed successfully.");
    process.exit(0);
})
    .catch((error) => {
    console.error("Database migration failed.", error);
    process.exit(1);
});
