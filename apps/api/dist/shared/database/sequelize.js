import { Sequelize } from "sequelize";
import { env } from "../config/env.js";
let sequelizeInstance = null;
export function getSequelize() {
    if (!sequelizeInstance) {
        sequelizeInstance = new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
            host: env.dbHost,
            port: env.dbPort,
            dialect: "mysql",
            logging: env.dbLogging ? console.log : false,
            define: {
                underscored: true,
                freezeTableName: true,
            },
        });
    }
    return sequelizeInstance;
}
