import { randomUUID } from "node:crypto";
import { Op, UniqueConstraintError, type Transaction } from "sequelize";
import { AppError } from "../../shared/errors/app-error.js";
import { Member } from "../../shared/database/models/index.js";
import { getSequelize } from "../../shared/database/sequelize.js";
import {
  commitAssets,
  validateCommittedCandidateAssets,
} from "../media/temp-media.store.js";
import type { MemberRegistrationRequest } from "./member-registration.schemas.js";

export function generateMembershipId(count: number, year: number) {
  return `MEM-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function getNextMembershipId(year: number, transaction?: Transaction) {
  const count = await Member.count({
    where: {
      createdAt: {
        [Op.gte]: new Date(`${year}-01-01T00:00:00.000Z`),
        [Op.lt]: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
    transaction,
  });

  return generateMembershipId(count, year);
}

export async function createMemberRegistration(
  payload: MemberRegistrationRequest,
) {
  if (
    payload.personalInformation.email &&
    (await Member.count({
      where: {
        email: payload.personalInformation.email.toLowerCase(),
      },
    })) > 0
  ) {
    throw new AppError(409, "DUPLICATE_EMAIL", "Email already belongs to an existing member.");
  }

  await validateCommittedCandidateAssets(payload.media);

  const sequelize = getSequelize();
  const memberId = randomUUID();

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const membershipId = await getNextMembershipId(
        new Date().getFullYear(),
        transaction,
      );

      await Member.create({
        memberId,
        membershipId,
        firstName: payload.personalInformation.firstName,
        middleName: payload.personalInformation.middleName || null,
        surname: payload.personalInformation.surname,
        gender: payload.personalInformation.gender,
        dateOfBirth: payload.personalInformation.dateOfBirth,
        phoneNumber: payload.personalInformation.phoneNumber,
        email: payload.personalInformation.email?.toLowerCase() ?? null,
        address: payload.personalInformation.address,
        occupation: payload.personalInformation.occupation || null,
        maritalStatus: payload.personalInformation.maritalStatus,
        weddingAnniversary:
          payload.personalInformation.weddingAnniversary || null,
        dateJoinedChurch: payload.membershipInformation.dateJoinedChurch,
        waterBaptized: payload.membershipInformation.waterBaptized,
        bornAgain: payload.membershipInformation.bornAgain,
        workerStatus: payload.membershipInformation.workerStatus,
        membershipStatus: payload.membershipInformation.membershipStatus,
        familyId: payload.membershipInformation.familyId || null,
        departmentId: payload.membershipInformation.departmentId || null,
        unitId: payload.membershipInformation.unitId || null,
        churchRoleId: payload.membershipInformation.churchRoleId,
        emergencyContactName: payload.personalInformation.emergencyContactName,
        emergencyContactPhone: payload.personalInformation.emergencyContactPhone,
        emergencyContactRelationship:
          payload.personalInformation.emergencyContactRelationship,
        medicalNotes: payload.personalInformation.medicalNotes || null,
        profilePhotoAssetId: payload.media.profilePhotoAssetId,
        registrationStatus: "COMPLETED",
        createdByUserId: "local-registrar",
      }, { transaction });

      await commitAssets(
        [
          payload.media.profilePhotoAssetId,
          ...payload.media.faceCaptureAssetIds,
        ],
        memberId,
        transaction,
      );

      return membershipId;
    });

    return {
      memberId,
      membershipId: result,
      faceCaptureCount: payload.media.faceCaptureAssetIds.length,
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new AppError(
        409,
        "UNIQUE_CONSTRAINT_ERROR",
        "Membership or email already exists.",
      );
    }

    throw error;
  }
}
