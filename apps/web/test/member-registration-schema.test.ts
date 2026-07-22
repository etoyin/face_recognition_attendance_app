import { describe, expect, it } from "vitest";
import {
  defaultRegistrationValues,
  memberRegistrationSchema,
} from "../lib/member-registration-schema";

describe("memberRegistrationSchema", () => {
  it("accepts a valid member registration payload", () => {
    const parsed = memberRegistrationSchema.safeParse({
      ...defaultRegistrationValues,
      firstName: "Grace",
      surname: "Okafor",
      dateOfBirth: "1994-05-12",
      phoneNumber: "08030000000",
      address: "12 Chapel Road",
      dateJoinedChurch: "2024-01-10",
      churchRoleId: "role-member",
      emergencyContactName: "John Okafor",
      emergencyContactPhone: "08031112222",
      emergencyContactRelationship: "Brother",
      profilePhotoAssetId: "asset-photo",
      faceCaptureAssetIds: Array.from({ length: 30 }, (_, index) => `asset-${index}`),
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects anniversary for unmarried members", () => {
    const parsed = memberRegistrationSchema.safeParse({
      ...defaultRegistrationValues,
      firstName: "Grace",
      surname: "Okafor",
      dateOfBirth: "1994-05-12",
      phoneNumber: "08030000000",
      address: "12 Chapel Road",
      dateJoinedChurch: "2024-01-10",
      churchRoleId: "role-member",
      emergencyContactName: "John Okafor",
      emergencyContactPhone: "08031112222",
      emergencyContactRelationship: "Brother",
      profilePhotoAssetId: "asset-photo",
      faceCaptureAssetIds: Array.from({ length: 30 }, (_, index) => `asset-${index}`),
      weddingAnniversary: "2020-01-10",
      maritalStatus: "SINGLE",
    });

    expect(parsed.success).toBe(false);
  });
});
