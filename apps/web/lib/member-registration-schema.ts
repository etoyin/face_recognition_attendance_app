import { z } from "zod";

export const workerStatusOptions = ["WORKER", "NON_WORKER"] as const;
export const membershipStatusOptions = [
  "ACTIVE",
  "INACTIVE",
  "NEW_MEMBER",
  "TRANSFERRED",
] as const;
export const genderOptions = ["MALE", "FEMALE"] as const;
export const maritalStatusOptions = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
] as const;

export const memberRegistrationSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required."),
    middleName: z.string().trim().optional(),
    surname: z.string().trim().min(2, "Surname is required."),
    gender: z.enum(genderOptions, {
      message: "Select a gender.",
    }),
    dateOfBirth: z.string().min(1, "Date of birth is required."),
    phoneNumber: z
      .string()
      .trim()
      .min(7, "Phone number is required.")
      .max(30, "Phone number is too long."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .or(z.literal(""))
      .optional(),
    address: z.string().trim().min(6, "Address is required."),
    occupation: z.string().trim().optional(),
    maritalStatus: z.enum(maritalStatusOptions, {
      message: "Select a marital status.",
    }),
    weddingAnniversary: z.string().optional(),
    dateJoinedChurch: z.string().min(1, "Date joined church is required."),
    waterBaptized: z.boolean(),
    bornAgain: z.boolean(),
    workerStatus: z.enum(workerStatusOptions, {
      message: "Select a worker status.",
    }),
    membershipStatus: z.enum(membershipStatusOptions, {
      message: "Select a membership status.",
    }),
    familyId: z.string().optional(),
    departmentOrUnitId: z.string().optional(),
    departmentId: z.string().optional(),
    unitId: z.string().optional(),
    churchRoleId: z.string().min(1, "Role in church is required."),
    emergencyContactName: z
      .string()
      .trim()
      .min(2, "Emergency contact name is required."),
    emergencyContactPhone: z
      .string()
      .trim()
      .min(7, "Emergency contact phone is required."),
    emergencyContactRelationship: z
      .string()
      .trim()
      .min(2, "Emergency contact relationship is required."),
    medicalNotes: z.string().trim().optional(),
    profilePhotoAssetId: z.string().min(1, "Profile photo is required."),
    faceCaptureAssetIds: z
      .array(z.string().min(1))
      .length(30, "Complete all 30 guided facial captures."),
  })
  .superRefine((values, context) => {
    if (
      values.weddingAnniversary &&
      values.maritalStatus !== "MARRIED"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weddingAnniversary"],
        message: "Wedding anniversary is only allowed for married members.",
      });
    }
  });

export type MemberRegistrationFormValues = z.infer<
  typeof memberRegistrationSchema
>;

export const defaultRegistrationValues: MemberRegistrationFormValues = {
  firstName: "",
  middleName: "",
  surname: "",
  gender: "MALE",
  dateOfBirth: "",
  phoneNumber: "",
  email: "",
  address: "",
  occupation: "",
  maritalStatus: "SINGLE",
  weddingAnniversary: "",
  dateJoinedChurch: "",
  waterBaptized: false,
  bornAgain: false,
  workerStatus: "NON_WORKER",
  membershipStatus: "NEW_MEMBER",
  familyId: "",
  departmentOrUnitId: "",
  departmentId: "",
  unitId: "",
  churchRoleId: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  medicalNotes: "",
  profilePhotoAssetId: "",
  faceCaptureAssetIds: [],
};
