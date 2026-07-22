"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  LoaderCircle,
  RefreshCw,
  ScanFace,
  Users,
  VideoOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type FaceCaptureItem = {
  assetId: string;
  previewUrl: string;
  pose: string;
  captureSequence: number;
};

type FaceEnrollmentPanelProps = {
  captures: FaceCaptureItem[];
  isUploading: boolean;
  error?: string;
  supportedPoses: string[];
  onCapture: (blob: Blob, pose: string, captureSequence: number) => Promise<void>;
  onRemoveCapture: (assetId: string) => Promise<void>;
};

type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
};

type BlendshapeCategory = {
  categoryName: string;
  score: number;
};

type FaceBlendshape = {
  categories: BlendshapeCategory[];
};

type MediaPipeDetectionResult = {
  faceLandmarks?: LandmarkPoint[][];
  faceBlendshapes?: FaceBlendshape[];
};

type MediaPipeFaceLandmarker = {
  detectForVideo: (
    source: HTMLVideoElement,
    timestampMs: number,
  ) => MediaPipeDetectionResult;
  close?: () => void;
};

type MediaPipeTasksVisionModule = {
  FaceLandmarker: {
    createFromOptions: (
      filesetResolver: unknown,
      options: Record<string, unknown>,
    ) => Promise<MediaPipeFaceLandmarker>;
  };
  FilesetResolver: {
    forVisionTasks: (wasmRoot: string) => Promise<unknown>;
  };
};

type DetectionMode =
  | "idle"
  | "initializing"
  | "searching"
  | "ready"
  | "capturing"
  | "multiple"
  | "misaligned"
  | "wrong_pose"
  | "manual";

type CaptureEngineMode = "loading" | "auto" | "manual";

type FaceAnalysis = {
  isPositioned: boolean;
  width: number;
  height: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  centerOffsetX: number;
  centerOffsetY: number;
  yaw: number;
  pitch: number;
  smileScore: number;
};

const guidedShotPlan = [
  "LOOK_FORWARD",
  "LOOK_FORWARD",
  "LOOK_FORWARD",
  "LOOK_FORWARD",
  "TURN_LEFT",
  "TURN_LEFT",
  "TURN_LEFT",
  "TURN_LEFT",
  "TURN_RIGHT",
  "TURN_RIGHT",
  "TURN_RIGHT",
  "TURN_RIGHT",
  "SLIGHT_LEFT",
  "SLIGHT_LEFT",
  "SLIGHT_LEFT",
  "SLIGHT_LEFT",
  "SLIGHT_RIGHT",
  "SLIGHT_RIGHT",
  "SLIGHT_RIGHT",
  "SLIGHT_RIGHT",
  "LOOK_UP",
  "LOOK_UP",
  "LOOK_UP",
  "LOOK_DOWN",
  "LOOK_DOWN",
  "LOOK_DOWN",
  "SMILE",
  "SMILE",
  "NEUTRAL",
  "NEUTRAL",
] as const;

const poseInstructions: Record<string, string> = {
  LOOK_FORWARD: "Face the camera directly and keep your head level.",
  TURN_LEFT: "Turn your face to your left until the left side is more visible.",
  TURN_RIGHT: "Turn your face to your right until the right side is more visible.",
  SLIGHT_LEFT: "Rotate slightly to your left, keeping your eyes visible.",
  SLIGHT_RIGHT: "Rotate slightly to your right, keeping your eyes visible.",
  LOOK_UP: "Lift your chin gently and look slightly upward.",
  LOOK_DOWN: "Lower your chin gently and look slightly downward.",
  SMILE: "Face the camera and smile naturally.",
  NEUTRAL: "Face the camera with a relaxed neutral expression.",
};

const holdSteadyMs = 900;
const guideFrame = {
  minX: 0.18,
  maxX: 0.82,
  minY: 0.12,
  maxY: 0.88,
};

function getPoseArrowConfig(pose: string) {
  switch (pose) {
    case "TURN_LEFT":
      return [{ position: "left", emphasis: "strong" }] as const;
    case "TURN_RIGHT":
      return [{ position: "right", emphasis: "strong" }] as const;
    case "SLIGHT_LEFT":
      return [{ position: "left", emphasis: "soft" }] as const;
    case "SLIGHT_RIGHT":
      return [{ position: "right", emphasis: "soft" }] as const;
    case "LOOK_UP":
      return [{ position: "top", emphasis: "strong" }] as const;
    case "LOOK_DOWN":
      return [{ position: "bottom", emphasis: "strong" }] as const;
    default:
      return [] as const;
  }
}

function midpoint(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: typeof a.z === "number" && typeof b.z === "number" ? (a.z + b.z) / 2 : 0,
  };
}

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

function analyzeFace(landmarks: LandmarkPoint[]): FaceAnalysis {
  const bounds = getBounds(landmarks);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const nose = landmarks[1];
  const leftEye = averagePoint(landmarks[33], landmarks[133]);
  const rightEye = averagePoint(landmarks[362], landmarks[263]);
  const eyeMidpoint = midpoint(leftEye, rightEye);
  const mouthCenter = averagePoint(landmarks[13], landmarks[14]);
  const verticalCenter = midpoint(eyeMidpoint, mouthCenter);

  const yaw = width > 0 ? (nose.x - centerX) / width : 0;
  const pitch = height > 0 ? (nose.y - verticalCenter.y) / height : 0;
  const centerOffsetX = centerX - 0.5;
  const centerOffsetY = centerY - 0.5;
  const isPositioned =
    width >= 0.24 &&
    height >= 0.3 &&
    bounds.minX >= guideFrame.minX &&
    bounds.maxX <= guideFrame.maxX &&
    bounds.minY >= guideFrame.minY &&
    bounds.maxY <= guideFrame.maxY;

  return {
    isPositioned,
    width,
    height,
    bounds,
    centerOffsetX,
    centerOffsetY,
    yaw,
    pitch,
    smileScore: 0,
  };
}

function isPoseMatched(pose: string, analysis: FaceAnalysis) {
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

function getPoseAdjustmentMessage(pose: string, analysis: FaceAnalysis) {
  const absYaw = Math.abs(analysis.yaw);
  const absPitch = Math.abs(analysis.pitch);

  switch (pose) {
    case "LOOK_FORWARD":
      return "Bring your face back to the center and keep your head level.";
    case "TURN_LEFT":
    case "TURN_RIGHT":
      return absYaw < 0.075
        ? "Rotate a little farther so more of one side of your face is visible."
        : "Hold that side angle steady.";
    case "SLIGHT_LEFT":
    case "SLIGHT_RIGHT":
      if (absYaw < 0.035) {
        return "Rotate just a little more to the side.";
      }

      return "Ease the turn slightly until the face is only mildly angled.";
    case "LOOK_UP":
      return absPitch < 0.035
        ? "Lift your chin a little higher."
        : "Hold the upward angle and keep your face centered.";
    case "LOOK_DOWN":
      return absPitch < 0.035
        ? "Lower your chin a little more."
        : "Hold the downward angle and keep your face centered.";
    case "SMILE":
      return "Look forward and smile naturally until the system confirms the frame.";
    case "NEUTRAL":
      return "Relax your expression and look straight into the camera.";
    default:
      return poseInstructions[pose] ?? "Adjust your face until the system confirms the shot.";
  }
}

function getAlignmentMessage(analysis: FaceAnalysis) {
  const hints: string[] = [];

  if (analysis.centerOffsetX > 0.05) {
    hints.push("Move left");
  } else if (analysis.centerOffsetX < -0.05) {
    hints.push("Move right");
  }

  if (analysis.centerOffsetY > 0.05) {
    hints.push("Move up");
  } else if (analysis.centerOffsetY < -0.05) {
    hints.push("Move down");
  }

  if (analysis.width < 0.28 || analysis.height < 0.34) {
    hints.push("Move closer");
  }

  return hints.length > 0 ? hints.join(" · ") : "Center your face";
}

async function createMediaPipeDetector() {
  const tasksVision = (await import(
    "@mediapipe/tasks-vision"
  )) as MediaPipeTasksVisionModule;

  const filesetResolver = await tasksVision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  );

  return tasksVision.FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 2,
    outputFaceBlendshapes: true,
  });
}

export function FaceEnrollmentPanel({
  captures,
  isUploading,
  error,
  supportedPoses,
  onCapture,
  onRemoveCapture,
}: FaceEnrollmentPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<MediaPipeFaceLandmarker | null>(null);
  const detectorInitPromiseRef = useRef<Promise<void> | null>(null);
  const lastStableBoundsRef = useRef<FaceAnalysis["bounds"] | null>(null);
  const stableFaceSinceRef = useRef<number | null>(null);
  const captureLockRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const lastProcessedTimeRef = useRef(-1);
  const cameraReadyRef = useRef(false);
  const nextPoseRef = useRef("LOOK_FORWARD");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const [captureEngineMode, setCaptureEngineMode] =
    useState<CaptureEngineMode>("loading");
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Start the camera to begin guided face enrollment. Smart auto-capture will initialize in the background.",
  );

  const nextPose = useMemo(() => {
    if (captures.length >= guidedShotPlan.length) {
      return guidedShotPlan[guidedShotPlan.length - 1];
    }

    if (supportedPoses.length === 0) {
      return "LOOK_FORWARD";
    }

    return guidedShotPlan[captures.length] ?? supportedPoses[0] ?? "LOOK_FORWARD";
  }, [captures.length, supportedPoses]);

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((captures.length / guidedShotPlan.length) * 100));
  }, [captures.length]);

  const poseBreakdown = useMemo(() => {
    return captures.reduce<Record<string, number>>((summary, capture) => {
      summary[capture.pose] = (summary[capture.pose] ?? 0) + 1;
      return summary;
    }, {});
  }, [captures]);

  useEffect(() => {
    cameraReadyRef.current = cameraReady;
  }, [cameraReady]);

  useEffect(() => {
    nextPoseRef.current = nextPose;
  }, [nextPose]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      detectorRef.current = null;
      detectorInitPromiseRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeDetector() {
      if (detectorRef.current || detectorInitPromiseRef.current) {
        await detectorInitPromiseRef.current;
        return;
      }

      const initialization = (async () => {
        try {
          const detector = await createMediaPipeDetector();

          if (cancelled) {
            // React Strict Mode replays mount effects in development. MediaPipe's
            // close() can emit console-level errors during that replay teardown,
            // so we keep the initialized detector alive and only drop the reference.
            return;
          }

          detectorRef.current = detector;
          setCaptureEngineMode("auto");
          setDetectionMode(cameraReadyRef.current ? "searching" : "initializing");
          setStatusMessage(
            cameraReadyRef.current
              ? `Smart auto-capture is active. ${poseInstructions[nextPoseRef.current] ?? "Align your face with the frame."}`
              : "Smart auto-capture is ready. Start the camera and follow each pose instruction.",
          );
        } catch {
          if (cancelled) {
            return;
          }

          setCaptureEngineMode("manual");
          setDetectionMode("manual");
          setStatusMessage(
            "Smart auto-capture is unavailable on this browser or network. Guided manual capture is active, so you can still complete all 30 shots.",
          );
        } finally {
          detectorInitPromiseRef.current = null;
        }
      })();

      detectorInitPromiseRef.current = initialization;
      await initialization;
    }

    void initializeDetector();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cameraReady || captureEngineMode !== "auto" || captures.length >= guidedShotPlan.length) {
      return;
    }

    let cancelled = false;

    const intervalId = window.setInterval(async () => {
      const detector = detectorRef.current;

      if (
        cancelled ||
        !videoRef.current ||
        !detector ||
        isUploading ||
        captureLockRef.current ||
        Date.now() < cooldownUntilRef.current
      ) {
        return;
      }

      const video = videoRef.current;

      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      try {
        if (video.currentTime === lastProcessedTimeRef.current) {
          return;
        }

        lastProcessedTimeRef.current = video.currentTime;
        const detection = detector.detectForVideo(video, performance.now());
        const faces = detection.faceLandmarks ?? [];

        if (faces.length === 0) {
          stableFaceSinceRef.current = null;
          setDetectionMode("searching");
          setStatusMessage(
            `No face detected yet. ${poseInstructions[nextPose] ?? "Align your face with the frame."}`,
          );
          return;
        }

        if (faces.length > 1) {
          stableFaceSinceRef.current = null;
          setDetectionMode("multiple");
          setStatusMessage(
            "Two or more faces detected. Ensure only one person is visible before capture continues.",
          );
          return;
        }

        const analysis = analyzeFace(faces[0]);
        analysis.smileScore = getBlendshapeScore(
          detection.faceBlendshapes?.[0]?.categories,
          ["mouthSmileLeft", "mouthSmileRight", "mouthSmile"],
        );

        if (!analysis.isPositioned) {
          lastStableBoundsRef.current = null;
          stableFaceSinceRef.current = null;
          setDetectionMode("misaligned");
          setStatusMessage(
            `Not aligned. ${getAlignmentMessage(analysis)}.`,
          );
          return;
        }

        if (!isPoseMatched(nextPose, analysis)) {
          lastStableBoundsRef.current = analysis.bounds;
          stableFaceSinceRef.current = null;
          setDetectionMode("wrong_pose");
          setStatusMessage(
            `${nextPose.replaceAll("_", " ")} is next. ${getPoseAdjustmentMessage(nextPose, analysis)}`,
          );
          return;
        }

        const now = Date.now();

        if (stableFaceSinceRef.current === null) {
          lastStableBoundsRef.current = analysis.bounds;
          stableFaceSinceRef.current = now;
          setDetectionMode("ready");
          setStatusMessage(
            `Exactly one face detected for ${nextPose.replaceAll("_", " ")}. Hold steady and capture will trigger automatically.`,
          );
          return;
        }

        if (now - stableFaceSinceRef.current < holdSteadyMs) {
          lastStableBoundsRef.current = analysis.bounds;
          setDetectionMode("ready");
          setStatusMessage(
            `Perfect. Hold still for ${nextPose.replaceAll("_", " ")} while the camera confirms the frame.`,
          );
          return;
        }

        captureLockRef.current = true;
        setDetectionMode("capturing");
        setStatusMessage(
          `Capturing ${nextPose.replaceAll("_", " ")} automatically.`,
        );

        await captureFrame(nextPose, captures.length + 1);

        cooldownUntilRef.current = Date.now() + 1200;
        stableFaceSinceRef.current = null;
      } catch (error) {
        stableFaceSinceRef.current = null;
        const captureError =
          error instanceof Error ? error : new Error("Smart auto-capture paused unexpectedly.");

        if (captureError.name === "CaptureRejectedError") {
          setCameraError(captureError.message);
          setDetectionMode("searching");
          setStatusMessage(
            `Retry ${nextPose.replaceAll("_", " ")} once one face is centered and ready.`,
          );
          cooldownUntilRef.current = Date.now() + 600;
          return;
        }

        setCameraError(
          "Smart auto-capture paused unexpectedly. Refresh the camera, or continue with guided manual capture if needed.",
        );
        setCaptureEngineMode("manual");
        setDetectionMode("manual");
      } finally {
        captureLockRef.current = false;
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [cameraReady, captureEngineMode, captures.length, isUploading, nextPose]);

  useEffect(() => {
    if (!cameraReady || captures.length < guidedShotPlan.length) {
      return;
    }

    setDetectionMode(captureEngineMode === "manual" ? "manual" : "ready");
    setStatusMessage(
      "All 30 guided shots are complete. Review the captured images and submit the registration when ready.",
    );
  }, [cameraReady, captureEngineMode, captures.length]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setCameraError(undefined);
      setCameraReady(true);
      stableFaceSinceRef.current = null;
      cooldownUntilRef.current = 0;
      lastProcessedTimeRef.current = -1;
      setDetectionMode(captureEngineMode === "auto" ? "searching" : "manual");
      setStatusMessage(
        captureEngineMode === "auto"
          ? `Camera is live. ${poseInstructions[nextPose] ?? "Align your face with the frame."}`
          : `Camera is live. Guided manual capture is active for ${nextPose.replaceAll("_", " ")}.`,
      );
    } catch {
      setCameraError(
        "Camera permission is required before face enrollment can begin.",
      );
      setCameraReady(false);
    }
  }

  async function captureFrame(pose: string, captureSequence: number) {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const cropBounds = captureEngineMode === "auto" ? lastStableBoundsRef.current : null;
    const outputSize = 640;

    if (cropBounds) {
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;
      const faceWidth = Math.max(1, (cropBounds.maxX - cropBounds.minX) * videoWidth);
      const faceHeight = Math.max(1, (cropBounds.maxY - cropBounds.minY) * videoHeight);
      const centerX = ((cropBounds.minX + cropBounds.maxX) / 2) * videoWidth;
      const centerY = ((cropBounds.minY + cropBounds.maxY) / 2) * videoHeight;
      const paddingFactor = 0.45;
      const side = Math.min(
        Math.max(faceWidth, faceHeight) * (1 + paddingFactor),
        Math.min(videoWidth, videoHeight),
      );
      const sx = Math.max(0, Math.round(centerX - side / 2));
      const sy = Math.max(0, Math.round(centerY - side / 2));
      const sWidth = Math.min(videoWidth - sx, Math.round(side));
      const sHeight = Math.min(videoHeight - sy, Math.round(side));

      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, outputSize, outputSize);
    } else {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      return;
    }

    await onCapture(blob, pose, captureSequence);
  }

  async function handleManualCapture() {
    if (!cameraReady || isUploading || captureLockRef.current) {
      return;
    }

    try {
      captureLockRef.current = true;
      setCameraError(undefined);
      setDetectionMode("capturing");
      setStatusMessage(
        `Capturing ${nextPose.replaceAll("_", " ")} in guided manual mode.`,
      );
      await captureFrame(nextPose, captures.length + 1);
      setStatusMessage(
        `Shot saved. Prepare for ${guidedShotPlan[captures.length + 1]?.replaceAll("_", " ") ?? "the next pose"}.`,
      );
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "The current frame could not be captured. Reposition the member and try again.",
      );
    } finally {
      captureLockRef.current = false;
    }
  }

  const captureModeBadge =
    captureEngineMode === "auto"
      ? "Smart auto-capture active"
      : captureEngineMode === "loading"
        ? "Smart guidance starting"
        : "Guided manual capture";
  const poseArrows = getPoseArrowConfig(nextPose);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[24px] border border-white/10 bg-[#08112b] p-4">
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#13204a] to-[#060c1d]">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-[3/4] w-full -scale-x-100 object-cover sm:aspect-[4/3]"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[72%] w-[72%] rounded-[28px] border border-emerald-300/35 bg-emerald-300/5 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
          </div>
          <div className="pointer-events-none absolute inset-0">
            {poseArrows.map((arrow, index) => {
              const isStrong = arrow.emphasis === "strong";
              const baseClassName =
                "absolute flex h-12 w-12 items-center justify-center rounded-full border text-white shadow-[0_10px_25px_rgba(0,0,0,0.18)] backdrop-blur-sm";
              const emphasisClassName = isStrong
                ? "border-amber-200/28 bg-amber-200/16"
                : "border-sky-200/24 bg-sky-200/12";
              const iconClassName = isStrong ? "h-6 w-6" : "h-5 w-5";

              if (arrow.position === "left") {
                return (
                  <div
                    key={`${arrow.position}-${index}`}
                    className={`${baseClassName} ${emphasisClassName} left-[10%] top-1/2 -translate-y-1/2`}
                  >
                    <ArrowLeft className={iconClassName} strokeWidth={2.2} />
                  </div>
                );
              }

              if (arrow.position === "right") {
                return (
                  <div
                    key={`${arrow.position}-${index}`}
                    className={`${baseClassName} ${emphasisClassName} right-[10%] top-1/2 -translate-y-1/2`}
                  >
                    <ArrowRight className={iconClassName} strokeWidth={2.2} />
                  </div>
                );
              }

              if (arrow.position === "top") {
                return (
                  <div
                    key={`${arrow.position}-${index}`}
                    className={`${baseClassName} ${emphasisClassName} left-1/2 top-[10%] -translate-x-1/2`}
                  >
                    <ArrowUp className={iconClassName} strokeWidth={2.2} />
                  </div>
                );
              }

              return (
                <div
                  key={`${arrow.position}-${index}`}
                  className={`${baseClassName} ${emphasisClassName} bottom-[14%] left-1/2 -translate-x-1/2`}
                >
                  <ArrowDown className={iconClassName} strokeWidth={2.2} />
                </div>
              );
            })}
          </div>
          {!cameraReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#08112b]/92 px-6 text-center">
              <VideoOff className="h-10 w-10 text-amber-300" />
              <p className="font-medium text-white">
                Camera access is required to capture facial enrollment images.
              </p>
              <p className="max-w-md text-sm leading-6 text-slate-300">
                Smart guidance initializes automatically. If it is unavailable, the workflow
                stays usable with guided manual capture.
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                <Camera className="h-4 w-4" />
                Start camera
              </button>
            </div>
          ) : null}
          {cameraReady ? (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3">
              <div className="rounded-2xl border border-white/10 bg-[#071129]/38 px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.24em] text-amber-100/80">
                  Live guidance
                </p>
                <p className="mt-1 text-sm leading-5 font-medium text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
                  {statusMessage}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0e1836] px-4 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <span>Progress</span>
            <span>{captures.length} / 30</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-300/70 transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Current guided pose
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {nextPose.replaceAll("_", " ")}
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
              {poseInstructions[nextPose] ??
                "Follow the instruction shown here before the frame is captured."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-full border border-white/14 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh camera
            </button>
            {captureEngineMode === "manual" ? (
              <button
                type="button"
                onClick={handleManualCapture}
                disabled={!cameraReady || isUploading || captures.length >= guidedShotPlan.length}
                className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isUploading || detectionMode === "capturing" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Capture current pose
              </button>
            ) : null}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100">
              {isUploading ||
              detectionMode === "capturing" ||
              captureEngineMode === "loading" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : detectionMode === "multiple" ? (
                <Users className="h-4 w-4" />
              ) : (
                <ScanFace className="h-4 w-4" />
              )}
              {captureModeBadge}
            </div>
          </div>
        </div>

        {(cameraError || error) ? (
          <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {cameraError ?? error}
          </p>
        ) : null}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
        <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Face capture progress
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {captures.length} / 30 confirmed
            </h3>
          </div>
          <p className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
            30 required for submission
          </p>
        </div>

        <div className="hidden rounded-2xl border border-white/10 bg-[#0e1836] px-4 py-4 lg:block lg:mt-4">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-300/70 transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Captured frames are stored securely, but thumbnails are hidden here for privacy. Follow the live guidance above until all 30 shots are confirmed.
          </p>
        </div>

        <div className="grid gap-3 lg:mt-4">
          {captures.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/12 px-4 py-6 text-sm text-slate-400">
              {captureEngineMode === "manual"
                ? "Use the guided instruction, keep one person in the frame, and save each pose with the capture button."
                : "Captures are added automatically after exactly one visible face is detected and aligned for each guided pose."}
            </p>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0e1836] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Pose breakdown
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(poseBreakdown).map(([pose, count]) => (
                  <span
                    key={pose}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {pose.replaceAll("_", " ")} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {captures.length > 0 ? (
            <button
              type="button"
              onClick={() => onRemoveCapture(captures[captures.length - 1].assetId)}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/15"
            >
              Remove last capture
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
