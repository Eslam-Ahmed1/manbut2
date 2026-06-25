import { GoogleGenerativeAI } from "@google/generative-ai";
import { appError } from "../../utils/appErrors.js";
import { getConfig } from "./config.js";
import type { DetectedDiseaseInput } from "../types/diseaseDetection.js";

const DISEASE_DETECTION_PROMPT = `
You are a plant disease detection system. Your ONLY job is to analyze plant images.

STEP 1 — Is this a plant image?
- If the image does NOT show a plant, leaf, flower, crop, tree, herb, or any vegetation, you MUST return exactly this JSON object (not an array):
  {"notAPlant": true, "reason": "brief reason why this is not a plant image"}
- Do NOT attempt to analyze diseases on non-plant images.

STEP 2 — If it IS a plant image, identify diseases:
- If the plant is completely healthy (no pathogenic disease visible), return an empty JSON array: []
- If diseases are present, return a JSON array of disease objects. Each object must have:
  "name" (string): One standardized common name from the RHS/APS disease list. No alternatives, parentheses, or words like 'likely', 'possibly', or 'or'.
  "treatment" (string): One standardized common treatment name. If none, use "none identified". No uncertainty words.
  "instructions" (string): Concise step-by-step treatment instructions.
  "description" (string): Brief description of the disease and visible symptoms.
- If multiple diseases are present, include one object per disease.

Return ONLY valid JSON — either {"notAPlant": true, "reason": "..."} or a JSON array [].
`;

const getGeminiModel = async () => {
    const apiKey = await getConfig("GEMINI_API_KEY");
    if (!apiKey) {
        throw new appError("Server configuration error: GEMINI_API_KEY is missing", 500);
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
    });
};

export const detectDiseasesWithGemini = async (
    imageBuffer: Buffer,
    mimeType: string,
): Promise<DetectedDiseaseInput[]> => {
    const model = await getGeminiModel();
    const imagePart = {
        inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
        },
    };

    console.log(`   ⏳ [SCAN] Calling Gemini AI...`);
    const t1 = Date.now();
    const result = await model.generateContent([DISEASE_DETECTION_PROMPT, imagePart]);
    const responseText = result.response.text();
    console.log(`   ✅ [SCAN] Gemini responded in ${Date.now() - t1}ms`);

    const parsed = JSON.parse(responseText);

    // Gemini explicitly told us this is not a plant image
    if (parsed && !Array.isArray(parsed) && parsed.notAPlant === true) {
        throw new appError(
            `This does not appear to be a plant image. ${parsed.reason ?? "Please upload a photo of a plant."}`,
            422,
        );
    }

    return Array.isArray(parsed) ? (parsed as DetectedDiseaseInput[]) : [];
};
