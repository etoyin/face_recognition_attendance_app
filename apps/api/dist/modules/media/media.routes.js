import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { AppError } from "../../shared/errors/app-error.js";
import { createTempAsset, deleteTempAsset, } from "./temp-media.store.js";
import { supportedCapturePoses, validateFaceCaptureFile, } from "./face-capture-validation.service.js";
const tempUploadsRoot = resolve(process.cwd(), "storage", "temp");
const upload = multer({
    storage: multer.diskStorage({
        destination: (_request, _file, callback) => {
            callback(null, tempUploadsRoot);
        },
        filename: (_request, file, callback) => {
            const safeExtension = file.originalname.split(".").pop() ?? "jpg";
            callback(null, `${randomUUID()}.${safeExtension}`);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_request, file, callback) => {
        const validMimeTypes = ["image/jpeg", "image/png"];
        if (!validMimeTypes.includes(file.mimetype)) {
            callback(new AppError(422, "INVALID_FILE_TYPE", "Only JPG and PNG uploads are supported."));
            return;
        }
        callback(null, true);
    },
});
export const mediaRouter = Router();
mediaRouter.post("/api/v1/media/profile-photo/upload-init", upload.single("file"), async (request, response, next) => {
    try {
        if (!request.file) {
            throw new AppError(422, "FILE_REQUIRED", "Profile photo file is required.");
        }
        const asset = await createTempAsset({
            fileName: request.file.filename,
            mimeType: request.file.mimetype,
            fileSizeBytes: request.file.size,
            assetType: "PROFILE_PHOTO",
        });
        response.status(201).json({
            data: {
                assetId: asset.assetId,
                previewUrl: asset.previewUrl,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
mediaRouter.post("/api/v1/media/face-captures/upload-init", upload.single("file"), async (request, response, next) => {
    try {
        if (!request.file) {
            throw new AppError(422, "FILE_REQUIRED", "Face capture file is required.");
        }
        const captureSequence = Number(request.body.captureSequence ?? 0);
        const requestedPose = String(request.body.pose ?? "LOOK_FORWARD");
        const pose = supportedCapturePoses.includes(requestedPose)
            ? requestedPose
            : "LOOK_FORWARD";
        await validateFaceCaptureFile({
            filePath: request.file.path,
            requestedPose: pose,
        });
        const asset = await createTempAsset({
            fileName: request.file.filename,
            mimeType: request.file.mimetype,
            fileSizeBytes: request.file.size,
            assetType: "FACE_CAPTURE",
            capturePose: pose,
            captureSequence,
        });
        response.status(201).json({
            data: {
                assetId: asset.assetId,
                previewUrl: asset.previewUrl,
                pose: asset.capturePose,
                captureSequence: asset.captureSequence,
            },
        });
    }
    catch (error) {
        if (request.file?.path) {
            await rm(request.file.path, { force: true }).catch(() => undefined);
        }
        next(error);
    }
});
mediaRouter.delete("/api/v1/media/temporary-assets/:assetId", async (request, response, next) => {
    try {
        await deleteTempAsset(request.params.assetId);
        response.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
