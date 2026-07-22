import { Router } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { createMemberRegistration } from "./member-registration.service.js";
import { memberRegistrationRequestSchema } from "./member-registration.schemas.js";

export const memberRegistrationRouter = Router();

memberRegistrationRouter.post(
  "/api/v1/members/registration",
  async (request, response, next) => {
    try {
      const parsed = memberRegistrationRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "The registration payload is invalid.",
          parsed.error.flatten().fieldErrors,
        );
      }

      const result = await createMemberRegistration(parsed.data);

      response.status(201).json({
        data: {
          ...result,
          registrationStatus: "COMPLETED",
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
