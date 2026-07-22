import { z } from "zod";
const personalInformationSchema = z.object({
    firstName: z.string().trim().min(2),
    middleName: z.string().trim().optional(),
    surname: z.string().trim().min(2),
    gender: z.enum(["MALE", "FEMALE"]),
    dateOfBirth: z.string().min(1),
    phoneNumber: z.string().trim().min(7),
    email: z.string().trim().email().optional(),
    address: z.string().trim().min(6),
    occupation: z.string().trim().optional(),
    maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]),
    weddingAnniversary: z.string().nullable().optional(),
    emergencyContactName: z.string().trim().min(2),
    emergencyContactPhone: z.string().trim().min(7),
    emergencyContactRelationship: z.string().trim().min(2),
    medicalNotes: z.string().trim().optional(),
});
const membershipInformationSchema = z.object({
    dateJoinedChurch: z.string().min(1),
    waterBaptized: z.boolean(),
    bornAgain: z.boolean(),
    workerStatus: z.enum(["WORKER", "NON_WORKER"]),
    membershipStatus: z.enum([
        "ACTIVE",
        "INACTIVE",
        "NEW_MEMBER",
        "TRANSFERRED",
    ]),
    familyId: z.string().nullable().optional(),
    departmentId: z.string().nullable().optional(),
    unitId: z.string().nullable().optional(),
    churchRoleId: z.string().min(1),
});
const mediaSchema = z.object({
    profilePhotoAssetId: z.string().min(1),
    faceCaptureAssetIds: z.array(z.string().min(1)).length(30),
});
export const memberRegistrationRequestSchema = z.object({
    personalInformation: personalInformationSchema,
    membershipInformation: membershipInformationSchema,
    media: mediaSchema,
});
