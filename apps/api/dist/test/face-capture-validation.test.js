import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { calculateBlurScore, isPoseSatisfied, } from "../modules/media/face-capture-validation.service.js";
describe("face capture validation helpers", () => {
    it("reports sharper images with a higher blur score", () => {
        const canvas = createCanvas(16, 16);
        const context = canvas.getContext("2d");
        context.fillStyle = "#808080";
        context.fillRect(0, 0, 16, 16);
        const softImage = context.getImageData(0, 0, 16, 16);
        context.fillStyle = "#000000";
        context.fillRect(0, 0, 8, 16);
        context.fillStyle = "#ffffff";
        context.fillRect(8, 0, 8, 16);
        const sharpImage = context.getImageData(0, 0, 16, 16);
        expect(calculateBlurScore(sharpImage)).toBeGreaterThan(calculateBlurScore(softImage));
    });
    it("matches smile and neutral poses using facial metrics", () => {
        expect(isPoseSatisfied("SMILE", {
            isPositioned: true,
            yaw: 0.01,
            pitch: 0.01,
            smileScore: 0.82,
            faceWidth: 0.38,
            faceHeight: 0.42,
        })).toBe(true);
        expect(isPoseSatisfied("NEUTRAL", {
            isPositioned: true,
            yaw: 0.01,
            pitch: 0.01,
            smileScore: 0.82,
            faceWidth: 0.38,
            faceHeight: 0.42,
        })).toBe(false);
    });
});
