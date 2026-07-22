import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Op, type Transaction } from "sequelize";
import { env } from "../../shared/config/env.js";
import { TemporaryMediaAsset } from "../../shared/database/models/index.js";
import { AppError } from "../../shared/errors/app-error.js";

type CapturePose =
  | "LOOK_FORWARD"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "LOOK_UP"
  | "LOOK_DOWN"
  | "SMILE"
  | "NEUTRAL"
  | "SLIGHT_LEFT"
  | "SLIGHT_RIGHT";

export type TempMediaAsset = {
  assetId: string;
  ownerUserId: string;
  memberId: string | null;
  assetType: "PROFILE_PHOTO" | "FACE_CAPTURE";
  storageKey: string;
  previewUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  capturePose?: CapturePose;
  captureSequence?: number;
  uploadStatus: "UPLOADED" | "COMMITTED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

const tempUploadsRoot = resolve(process.cwd(), "storage", "temp");

export async function createTempAsset(input: {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  assetType: "PROFILE_PHOTO" | "FACE_CAPTURE";
  capturePose?: CapturePose;
  captureSequence?: number;
}) {
  const now = new Date();
  const assetId = randomUUID();
  const expiresAt = new Date(
    now.getTime() + env.uploadTtlHours * 60 * 60 * 1000,
  ).toISOString();

  const asset: TempMediaAsset = {
    assetId,
    ownerUserId: "local-registrar",
    memberId: null,
    assetType: input.assetType,
    storageKey: input.fileName,
    previewUrl: `${env.publicApiUrl}/uploads/temp/${input.fileName}`,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    capturePose: input.capturePose,
    captureSequence: input.captureSequence,
    uploadStatus: "UPLOADED",
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await TemporaryMediaAsset.create({
    assetId: asset.assetId,
    ownerUserId: asset.ownerUserId,
    memberId: asset.memberId,
    assetType: asset.assetType,
    storageKey: asset.storageKey,
    previewUrl: asset.previewUrl,
    mimeType: asset.mimeType,
    fileSizeBytes: asset.fileSizeBytes,
    capturePose: asset.capturePose ?? null,
    captureSequence: asset.captureSequence ?? null,
    uploadStatus: asset.uploadStatus,
    expiresAt: new Date(asset.expiresAt),
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt),
  });

  return asset;
}

export async function getTempAsset(assetId: string) {
  return TemporaryMediaAsset.findByPk(assetId);
}

export async function deleteTempAsset(assetId: string) {
  const asset = await TemporaryMediaAsset.findByPk(assetId);

  if (!asset) {
    throw new AppError(404, "ASSET_NOT_FOUND", "Temporary asset not found.");
  }

  await rm(resolve(tempUploadsRoot, asset.storageKey), { force: true });
  await asset.destroy();
}

export async function commitAssets(
  assetIds: string[],
  memberId: string,
  transaction?: Transaction,
) {
  await TemporaryMediaAsset.update(
    {
      memberId,
      uploadStatus: "COMMITTED",
      updatedAt: new Date(),
    },
    {
      where: {
        assetId: {
          [Op.in]: assetIds,
        },
      },
      transaction,
    },
  );
}

export async function validateCommittedCandidateAssets(input: {
  profilePhotoAssetId: string;
  faceCaptureAssetIds: string[];
}) {
  const profilePhoto = await TemporaryMediaAsset.findByPk(
    input.profilePhotoAssetId,
  );
  const faceCaptures = await TemporaryMediaAsset.findAll({
    where: {
      assetId: {
        [Op.in]: input.faceCaptureAssetIds,
      },
    },
  });

  if (!profilePhoto || profilePhoto.assetType !== "PROFILE_PHOTO") {
    throw new AppError(422, "INVALID_PROFILE_PHOTO", "Profile photo asset is invalid.");
  }

  if (faceCaptures.length !== input.faceCaptureAssetIds.length) {
    throw new AppError(422, "MISSING_FACE_CAPTURE", "One or more facial captures could not be found.");
  }

  if (
    faceCaptures.some(
      (asset) =>
        asset.assetType !== "FACE_CAPTURE" || asset.uploadStatus === "EXPIRED",
    )
  ) {
    throw new AppError(422, "INVALID_FACE_CAPTURE", "Face capture asset list contains invalid media.");
  }

  if (profilePhoto.uploadStatus === "EXPIRED") {
    throw new AppError(
      422,
      "INVALID_PROFILE_PHOTO",
      "Profile photo asset has expired.",
    );
  }

  return { profilePhoto, faceCaptures };
}
