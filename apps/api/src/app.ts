import cors from "cors";
import express from "express";
import { resolve } from "node:path";
import { env } from "./shared/config/env.js";
import {
  errorHandler,
  notFoundHandler,
} from "./shared/middleware/error-handler.js";
import { mediaRouter } from "./modules/media/media.routes.js";
import { memberRegistrationRouter } from "./modules/member-registration/member-registration.routes.js";
import { optionsRouter } from "./modules/options/options.routes.js";

export function createApp() {
  const app = express();
  const allowedOrigins = new Set(env.clientUrls);

  app.set("trust proxy", true);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");
        const isConfiguredClient = allowedOrigins.has(normalizedOrigin);
        const isLocalhostDevOrigin =
          /^http:\/\/localhost:\d+$/.test(normalizedOrigin) ||
          /^http:\/\/127\.0\.0\.1:\d+$/.test(normalizedOrigin);

        callback(null, isConfiguredClient || isLocalhostDevOrigin);
      },
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(
    "/uploads/temp",
    express.static(resolve(process.cwd(), "storage", "temp")),
  );

  app.get("/health", (_request, response) => {
    response.json({
      data: {
        status: "ok",
      },
    });
  });

  app.use(optionsRouter);
  app.use(mediaRouter);
  app.use(memberRegistrationRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
