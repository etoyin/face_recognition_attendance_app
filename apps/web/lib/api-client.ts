import axios from "axios";
import type { MemberRegistrationFormValues } from "./member-registration-schema";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
});

export type OptionItem = {
  id: string;
  label: string;
  description?: string;
  type?: "department" | "unit";
};

export type RegistrationMetaResponse = {
  families: OptionItem[];
  departmentUnits: OptionItem[];
  churchRoles: OptionItem[];
  captureRequirements: {
    minImages: number;
    maxImages: number;
    supportedPoses: string[];
  };
};

export type TempAssetResponse = {
  assetId: string;
  previewUrl: string;
  pose?: string;
  captureSequence?: number;
};

export type RegistrationSuccessResponse = {
  memberId: string;
  membershipId: string;
  faceCaptureCount: number;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
};

type MemberRegistrationPayload = {
  personalInformation: {
    firstName: string;
    middleName?: string;
    surname: string;
    gender: string;
    dateOfBirth: string;
    phoneNumber: string;
    email?: string;
    address: string;
    occupation?: string;
    maritalStatus: string;
    weddingAnniversary?: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
    medicalNotes?: string;
  };
  membershipInformation: {
    dateJoinedChurch: string;
    waterBaptized: boolean;
    bornAgain: boolean;
    workerStatus: string;
    membershipStatus: string;
    familyId?: string | null;
    departmentId?: string | null;
    unitId?: string | null;
    churchRoleId: string;
  };
  media: {
    profilePhotoAssetId: string;
    faceCaptureAssetIds: string[];
  };
};

export async function fetchRegistrationMeta() {
  const response = await apiClient.get<{ data: RegistrationMetaResponse }>(
    "/api/v1/members/registration-meta",
  );
  return response.data.data;
}

export async function uploadProfilePhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ data: TempAssetResponse }>(
    "/api/v1/media/profile-photo/upload-init",
    formData,
  );

  return response.data.data;
}

export async function uploadFaceCapture(
  file: Blob,
  pose: string,
  captureSequence: number,
) {
  const formData = new FormData();
  formData.append("file", file, `face-capture-${captureSequence}.jpg`);
  formData.append("pose", pose);
  formData.append("captureSequence", String(captureSequence));

  const response = await apiClient.post<{ data: TempAssetResponse }>(
    "/api/v1/media/face-captures/upload-init",
    formData,
  );

  return response.data.data;
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallbackMessage;
  }

  const apiMessage = error.response?.data?.error?.message;

  if (apiMessage) {
    return apiMessage;
  }

  return fallbackMessage;
}

export async function removeTempAsset(assetId: string) {
  await apiClient.delete(`/api/v1/media/temporary-assets/${assetId}`);
}

export async function submitMemberRegistration(
  values: MemberRegistrationFormValues,
) {
  const payload: MemberRegistrationPayload = {
    personalInformation: {
      firstName: values.firstName,
      middleName: values.middleName || undefined,
      surname: values.surname,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth,
      phoneNumber: values.phoneNumber,
      email: values.email || undefined,
      address: values.address,
      occupation: values.occupation || undefined,
      maritalStatus: values.maritalStatus,
      weddingAnniversary: values.weddingAnniversary || null,
      emergencyContactName: values.emergencyContactName,
      emergencyContactPhone: values.emergencyContactPhone,
      emergencyContactRelationship: values.emergencyContactRelationship,
      medicalNotes: values.medicalNotes || undefined,
    },
    membershipInformation: {
      dateJoinedChurch: values.dateJoinedChurch,
      waterBaptized: values.waterBaptized,
      bornAgain: values.bornAgain,
      workerStatus: values.workerStatus,
      membershipStatus: values.membershipStatus,
      familyId: values.familyId || null,
      departmentId: values.departmentId || null,
      unitId: values.unitId || null,
      churchRoleId: values.churchRoleId,
    },
    media: {
      profilePhotoAssetId: values.profilePhotoAssetId,
      faceCaptureAssetIds: values.faceCaptureAssetIds,
    },
  };

  const response = await apiClient.post<{ data: RegistrationSuccessResponse }>(
    "/api/v1/members/registration",
    payload,
  );

  return response.data.data;
}
