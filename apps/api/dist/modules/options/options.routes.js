import { Router } from "express";
import { getRegistrationMeta } from "./options.service.js";
export const optionsRouter = Router();
optionsRouter.get("/api/v1/members/registration-meta", async (_request, response, next) => {
    try {
        const registrationMeta = await getRegistrationMeta();
        response.json({
            data: registrationMeta,
        });
    }
    catch (error) {
        next(error);
    }
});
optionsRouter.get("/api/v1/families/options", async (_request, response, next) => {
    try {
        const registrationMeta = await getRegistrationMeta();
        response.json({ data: registrationMeta.families });
    }
    catch (error) {
        next(error);
    }
});
optionsRouter.get("/api/v1/departments/options", async (_request, response, next) => {
    try {
        const registrationMeta = await getRegistrationMeta();
        response.json({ data: registrationMeta.departments });
    }
    catch (error) {
        next(error);
    }
});
optionsRouter.get("/api/v1/units/options", async (_request, response, next) => {
    try {
        const registrationMeta = await getRegistrationMeta();
        response.json({ data: registrationMeta.units });
    }
    catch (error) {
        next(error);
    }
});
optionsRouter.get("/api/v1/church-roles/options", async (_request, response, next) => {
    try {
        const registrationMeta = await getRegistrationMeta();
        response.json({ data: registrationMeta.churchRoles });
    }
    catch (error) {
        next(error);
    }
});
