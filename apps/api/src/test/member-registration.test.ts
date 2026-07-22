import { describe, expect, it } from "vitest";
import { generateMembershipId } from "../modules/member-registration/member-registration.service.js";
import { memberRegistrationRequestSchema } from "../modules/member-registration/member-registration.schemas.js";

describe("member registration service", () => {
  it("generates predictable membership identifiers", () => {
    expect(generateMembershipId(0, 2026)).toBe("MEM-2026-0001");
    expect(generateMembershipId(18, 2026)).toBe("MEM-2026-0019");
  });

  it("requires all thirty guided facial captures", () => {
    const parsed = memberRegistrationRequestSchema.safeParse({
      personalInformation: {
        firstName: "Mary",
        surname: "Adewale",
        gender: "FEMALE",
        dateOfBirth: "1990-01-01",
        phoneNumber: "09012345678",
        address: "1 Hope Street",
        maritalStatus: "MARRIED",
        emergencyContactName: "David Adewale",
        emergencyContactPhone: "09087654321",
        emergencyContactRelationship: "Spouse",
      },
      membershipInformation: {
        dateJoinedChurch: "2025-07-10",
        waterBaptized: true,
        bornAgain: true,
        workerStatus: "WORKER",
        membershipStatus: "ACTIVE",
        churchRoleId: "role-worker",
      },
      media: {
        profilePhotoAssetId: "profile-asset",
        faceCaptureAssetIds: ["only-one"],
      },
    });

    expect(parsed.success).toBe(false);
  });
});
