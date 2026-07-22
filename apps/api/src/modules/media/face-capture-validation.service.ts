import { createCanvas, loadImage, type ImageData } from "@napi-rs/canvas";
import {
  FaceLandmarker,
  FilesetResolver,
  type ImageSource,
} from "@mediapipe/tasks-vision";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { AppError } from "../../shared/errors/app-error.js";

export const supportedCapturePoses = [
  "LOOK_FORWARD",
  "TURN_LEFT",
  "TURN_RIGHT",
  "LOOK_UP",
  "LOOK_DOWN",
  "SMILE",
  "NEUTRAL",
  "SLIGHT_LEFT",
  "SLIGHT_RIGHT",
] as const;

export type CapturePose = (typeof supportedCapturePoses)[number];

type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
};

type BlendshapeCategory = {
  categoryName: string;
  score: number;
};

type FaceAnalysis = {
  isPositioned: boolean;
  yaw: number;
  pitch: number;
  smileScore: number;
  faceWidth: number;
  faceHeight: number;
};

const minImageDimension = 320;
const minBlurVariance = 45;
const maxImageDimension = 640;
const detectionConfidence = 0.55;
const poseConfidence = 0.55;
const trackingConfidence = 0.5;
let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let serverFaceValidationAvailable =
  typeof (globalThis as { document?: unknown }).document !== "undefined";

function averagePoint(...points: LandmarkPoint[]) {
  const count = points.length || 1;

  return points.reduce<LandmarkPoint>(
    (carry, point) => ({
      x: carry.x + point.x / count,
      y: carry.y + point.y / count,
      z: (carry.z ?? 0) + (point.z ?? 0) / count,
    }),
    { x: 0, y: 0, z: 0 },
  );
}

function midpoint(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: typeof a.z === "number" && typeof b.z === "number" ? (a.z + b.z) / 2 : 0,
  };
}

function getBounds(points: LandmarkPoint[]) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function getBlendshapeScore(categories: BlendshapeCategory[] = [], names: string[]) {
  return names.reduce((highestScore, name) => {
    const match = categories.find((category) => category.categoryName === name);
    return Math.max(highestScore, match?.score ?? 0);
  }, 0);
}

function analyzeFace(
  landmarks: LandmarkPoint[],
  blendshapeCategories: BlendshapeCategory[] = [],
): FaceAnalysis {
  const bounds = getBounds(landmarks);
  const faceWidth = bounds.maxX - bounds.minX;
  const faceHeight = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;

  const nose = landmarks[1];
  const leftEye = averagePoint(landmarks[33], landmarks[133]);
  const rightEye = averagePoint(landmarks[362], landmarks[263]);
  const eyeMidpoint = midpoint(leftEye, rightEye);
  const mouthCenter = averagePoint(landmarks[13], landmarks[14]);
  const verticalCenter = midpoint(eyeMidpoint, mouthCenter);

  const yaw = faceWidth > 0 ? (nose.x - centerX) / faceWidth : 0;
  const pitch = faceHeight > 0 ? (nose.y - verticalCenter.y) / faceHeight : 0;
  const smileScore = getBlendshapeScore(blendshapeCategories, [
    "mouthSmileLeft",
    "mouthSmileRight",
    "mouthSmile",
  ]);
  const isPositioned =
    faceWidth >= 0.22 &&
    faceHeight >= 0.28 &&
    bounds.minX >= 0.08 &&
    bounds.maxX <= 0.92 &&
    bounds.minY >= 0.08 &&
    bounds.maxY <= 0.92;

  return {
    isPositioned,
    yaw,
    pitch,
    smileScore,
    faceWidth,
    faceHeight,
  };
}

export function isPoseSatisfied(pose: CapturePose, analysis: FaceAnalysis) {
  const absYaw = Math.abs(analysis.yaw);
  const absPitch = Math.abs(analysis.pitch);

  switch (pose) {
    case "LOOK_FORWARD":
      return absYaw <= 0.05 && absPitch <= 0.055;
    case "TURN_LEFT":
    case "TURN_RIGHT":
      return absYaw >= 0.075;
    case "SLIGHT_LEFT":
    case "SLIGHT_RIGHT":
      return absYaw >= 0.035 && absYaw <= 0.09;
    case "LOOK_UP":
    case "LOOK_DOWN":
      return absPitch >= 0.035;
    case "SMILE":
      return analysis.smileScore >= 0.35 && absYaw <= 0.06 && absPitch <= 0.08;
    case "NEUTRAL":
      return analysis.smileScore <= 0.2 && absYaw <= 0.06 && absPitch <= 0.06;
    default:
      return true;
  }
}

function getPoseGuidance(pose: CapturePose) {
  switch (pose) {
    case "LOOK_FORWARD":
      return "Look straight into the camera and keep your head level.";
    case "TURN_LEFT":
      return "Turn your face farther to the left until one side is more visible.";
    case "TURN_RIGHT":
      return "Turn your face farther to the right until one side is more visible.";
    case "SLIGHT_LEFT":
      return "Rotate slightly to the left instead of facing the camera directly.";
    case "SLIGHT_RIGHT":
      return "Rotate slightly to the right instead of facing the camera directly.";
    case "LOOK_UP":
      return "Lift your chin a little higher while keeping your face centered.";
    case "LOOK_DOWN":
      return "Lower your chin slightly while keeping your face centered.";
    case "SMILE":
      return "Smile naturally and keep your face looking forward.";
    case "NEUTRAL":
      return "Relax your face and look straight ahead.";
  }
}

export function calculateBlurScore(imageData: ImageData) {
  const { data, width, height } = imageData;
  const grayscale = new Float64Array(width * height);

  for (let index = 0; index < grayscale.length; index += 1) {
    const dataOffset = index * 4;
    grayscale[index] =
      data[dataOffset] * 0.299 +
      data[dataOffset + 1] * 0.587 +
      data[dataOffset + 2] * 0.114;
  }

  let sum = 0;
  let sumSquares = 0;
  let sampleCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const laplacian =
        grayscale[index - width] +
        grayscale[index - 1] +
        grayscale[index + 1] +
        grayscale[index + width] -
        4 * grayscale[index];

      sum += laplacian;
      sumSquares += laplacian * laplacian;
      sampleCount += 1;
    }
  }

  if (sampleCount === 0) {
    return 0;
  }

  const mean = sum / sampleCount;
  return sumSquares / sampleCount - mean * mean;
}

async function getLandmarker() {
  if (!serverFaceValidationAvailable) {
    throw new AppError(
      503,
      "FACE_VALIDATION_UNAVAILABLE",
      "Face validation is temporarily unavailable. Try again in a moment.",
    );
  }

  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const wasmRoot = resolve(
        process.cwd(),
        "..",
        "..",
        "node_modules",
        "@mediapipe",
        "tasks-vision",
        "wasm",
      );
      const visionFileset = await FilesetResolver.forVisionTasks(
        pathToFileURL(wasmRoot).href,
      );

      return FaceLandmarker.createFromOptions(visionFileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 2,
        minFaceDetectionConfidence: detectionConfidence,
        minFacePresenceConfidence: poseConfidence,
        minTrackingConfidence: trackingConfidence,
        outputFaceBlendshapes: true,
      });
    })().catch((error) => {
      if (
        error instanceof Error &&
        error.name === "ReferenceError" &&
        error.message.includes("document is not defined")
      ) {
        serverFaceValidationAvailable = false;
      }
      landmarkerPromise = null;
      throw error;
    });
  }

  return landmarkerPromise;
}

async function loadImageData(filePath: string) {
  const image = await loadImage(filePath);
  const scale = Math.min(
    1,
    maxImageDimension / Math.max(image.width, image.height),
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  context.drawImage(image, 0, 0, width, height);

  return {
    imageData: context.getImageData(0, 0, width, height),
    originalWidth: image.width,
    originalHeight: image.height,
  };
}

export async function validateFaceCaptureFile(input: {
  filePath: string;
  requestedPose: CapturePose;
}) {
  let imageData: ImageData;
  let originalWidth = 0;
  let originalHeight = 0;

  try {
    const loadedImage = await loadImageData(input.filePath);
    imageData = loadedImage.imageData;
    originalWidth = loadedImage.originalWidth;
    originalHeight = loadedImage.originalHeight;
  } catch {
    throw new AppError(
      422,
      "INVALID_IMAGE_FILE",
      "The uploaded face capture could not be processed as a valid image.",
    );
  }

  if (
    originalWidth < minImageDimension ||
    originalHeight < minImageDimension
  ) {
    throw new AppError(
      422,
      "FACE_CAPTURE_TOO_SMALL",
      "The captured image is too small. Move closer and try again.",
      {
        image: [
          `Minimum image size is ${minImageDimension}x${minImageDimension} pixels.`,
        ],
      },
    );
  }

  const blurScore = calculateBlurScore(imageData);

  if (blurScore < minBlurVariance) {
    throw new AppError(
      422,
      "FACE_CAPTURE_BLURRY",
      "The captured image is blurry. Hold still and try again.",
      {
        image: ["Use better lighting and keep the camera steady before capturing."],
      },
    );
  }

  let detectionResult: {
    faceLandmarks: LandmarkPoint[][];
    faceBlendshapes?: { categories: BlendshapeCategory[] }[];
  };

  if (!serverFaceValidationAvailable) {
    return {
      accepted: true,
      blurScore,
      faceCount: null,
      pose: input.requestedPose,
      validationSkipped: true,
    };
  }

  try {
    const landmarker = await getLandmarker();
    // MediaPipe accepts pixel-backed image sources at runtime, but its type is
    // defined around browser canvas/image interfaces.
    const detected = landmarker.detect(imageData as unknown as ImageSource);

    detectionResult = {
      faceLandmarks: detected.faceLandmarks as LandmarkPoint[][],
      faceBlendshapes: detected.faceBlendshapes as {
        categories: BlendshapeCategory[];
      }[],
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ReferenceError" &&
      error.message.includes("document is not defined")
    ) {
      serverFaceValidationAvailable = false;
    }

    return {
      accepted: true,
      blurScore,
      faceCount: null,
      pose: input.requestedPose,
      validationSkipped: true,
    };
  }

  const faceCount = detectionResult.faceLandmarks.length;

  if (faceCount === 0) {
    throw new AppError(
      422,
      "FACE_NOT_DETECTED",
      "No face was detected in the captured image. Position one person in the frame and try again.",
    );
  }

  if (faceCount > 1) {
    throw new AppError(
      422,
      "MULTIPLE_FACES_DETECTED",
      "Multiple faces were detected. Ensure only one person is visible before capturing.",
    );
  }

  const analysis = analyzeFace(
    detectionResult.faceLandmarks[0],
    detectionResult.faceBlendshapes?.[0]?.categories ?? [],
  );

  if (!analysis.isPositioned) {
    throw new AppError(
      422,
      "FACE_NOT_CENTERED",
      "One face was found, but it is too close to the edge or too small in the frame.",
      {
        image: ["Center the face and move slightly closer before capturing."],
      },
    );
  }

  if (!isPoseSatisfied(input.requestedPose, analysis)) {
    throw new AppError(
      422,
      "WRONG_FACE_POSE",
      `The captured image does not match the required ${input.requestedPose.replace(/_/g, " ").toLowerCase()} pose.`,
      {
        pose: [getPoseGuidance(input.requestedPose)],
      },
    );
  }

  return {
    accepted: true,
    blurScore,
    faceCount,
    pose: input.requestedPose,
  };
}
