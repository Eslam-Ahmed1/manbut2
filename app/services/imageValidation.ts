import { GoogleGenerativeAI } from "@google/generative-ai";
import { appError } from "../../utils/appErrors.js";
import { getConfig } from "./config.js";
import { getImageValidationSettings } from "./scanModelSettings.js";
import logger from "../../utils/logger.js";

// ─── Types ───────────────────────────────────────────────────────────
type PlantCheckResult = {
    isPlant: boolean;
    confidence: number;
    reason: string;
};

// ─── Constants ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

/**
 * Magic bytes signatures for supported image formats.
 * Checked in order; first match wins.
 */
const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
    // JPEG: FF D8 FF
    { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
    { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const PLANT_CHECK_PROMPT = `You are an image classifier. Your ONLY job is to determine whether this image contains a plant (leaf, flower, tree, crop, herb, grass, shrub, etc.).

Rules:
- If the image clearly shows a plant or part of a plant, answer isPlant = true.
- If the image is NOT a plant (e.g., animal, person, car, food, text, meme, screenshot, object), answer isPlant = false.
- Do NOT analyze diseases. Just classify plant vs non-plant.

Return ONLY this JSON, nothing else:
{"isPlant": true/false, "confidence": 0.0-1.0, "reason": "brief reason in English"}`;

// ─── Layer 1: File & Image Validation (Free — no AI) ────────────────

/**
 * Validates the uploaded file without calling any external API.
 * Checks: MIME type → magic bytes → file size.
 * Throws appError(400) on failure.
 */
export const validateImageFile = (
    imageBuffer: Buffer,
    mimeType: string,
): void => {
    // 1. MIME type whitelist
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new appError(
            `Unsupported file type "${mimeType}". Only JPEG, PNG, and WebP images are allowed.`,
            400,
        );
    }

    // 2. File size
    if (imageBuffer.length > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(1);
        throw new appError(
            `File too large (${sizeMB} MB). Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
            400,
        );
    }

    // 3. Magic bytes — make sure file content matches claimed MIME type
    if (imageBuffer.length < 8) {
        throw new appError("File is too small to be a valid image.", 400);
    }

    const matchesMagic = MAGIC_BYTES.some(({ bytes }) =>
        bytes.every((byte, i) => imageBuffer[i] === byte),
    );

    if (!matchesMagic) {
        throw new appError(
            "File content does not match a valid image format. The file may be corrupted or renamed.",
            400,
        );
    }
};

// ─── Layer 2: Gemini Plant Classification (Lightweight Pre-Check) ───

/**
 * Asks Gemini a single lightweight question: "Is this a plant?"
 * Returns the classification result. Throws appError(422) if NOT a plant.
 */
export const verifyPlantImage = async (
    imageBuffer: Buffer,
    mimeType: string,
    confidenceThreshold: number,
): Promise<PlantCheckResult> => {
    const apiKey = await getConfig("GEMINI_API_KEY");
    if (!apiKey) {
        // If Gemini is not configured, skip the check gracefully
        logger.warn("⚠️ [VALIDATE] GEMINI_API_KEY missing — skipping plant pre-check");
        return { isPlant: true, confidence: 1, reason: "Skipped: no API key" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
    });

    const imagePart = {
        inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
        },
    };

    logger.debug("   🔍 [VALIDATE] Checking if image is a plant...");
    const t0 = Date.now();

    try {
        const result = await model.generateContent([PLANT_CHECK_PROMPT, imagePart]);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText) as PlantCheckResult;

        logger.debug(
            `   ${parsed.isPlant ? "✅" : "❌"} [VALIDATE] Plant check: isPlant=${parsed.isPlant}, confidence=${parsed.confidence} — ${Date.now() - t0}ms`,
        );

        // Apply confidence threshold
        if (!parsed.isPlant || parsed.confidence < confidenceThreshold) {
            throw new appError(
                `This does not appear to be a plant image. Reason: ${parsed.reason || "Not a plant"}`,
                422,
            );
        }

        return parsed;
    } catch (error) {
        // Re-throw our own appErrors
        if (error instanceof appError) throw error;

        // Gemini failure — log but don't block the user
        logger.error(`⚠️ [VALIDATE] Plant check failed, allowing through:`, error);
        return { isPlant: true, confidence: 1, reason: "Pre-check failed, allowed through" };
    }
};

// ─── Main Entry Point ───────────────────────────────────────────────

/**
 * Runs all validation layers in sequence.
 * Layer 1 → file validation (free)
 * Layer 2 → Gemini plant classification (lightweight AI call)
 *
 * If validation is disabled by admin, skips all checks.
 */
export const validateAndVerifyImage = async (
    imageBuffer: Buffer,
    mimeType: string,
): Promise<void> => {
    const settings = await getImageValidationSettings();

    if (!settings.enabled) {
        logger.debug("⏭️ [VALIDATE] Image validation disabled by admin — skipping");
        return;
    }

    // Layer 1: File validation (always runs when enabled — it's free)
    validateImageFile(imageBuffer, mimeType);
    logger.debug("✅ [VALIDATE] Layer 1 passed: valid image file");

    // Layer 2: Gemini plant check
    await verifyPlantImage(imageBuffer, mimeType, settings.confidenceThreshold);
    logger.debug("✅ [VALIDATE] Layer 2 passed: image is a plant");
};
