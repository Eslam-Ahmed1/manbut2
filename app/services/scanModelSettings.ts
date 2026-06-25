import { getConfig, setConfig } from "./config.js";
import { appError } from "../../utils/appErrors.js";
import type {
    ImageValidationSettings,
    ScanDetectionMode,
    ScanDetectionSettings,
    ScanDetectionSettingsUpdate,
} from "../types/scanDetectionSettings.ts";

export const SCAN_DETECTION_CONFIG_KEYS = {
    MODE: "SCAN_DETECTION_MODE",
    PLANT_MODEL_ENABLED: "PLANT_MODEL_ENABLED",
    PLANT_MODEL_URL: "PLANT_MODEL_URL",
    PLANT_MODEL_CONFIDENCE_THRESHOLD: "PLANT_MODEL_CONFIDENCE_THRESHOLD",
    PLANT_MODEL_DISEASE_CONFIDENCE_THRESHOLD:
        "PLANT_MODEL_DISEASE_CONFIDENCE_THRESHOLD",
    PLANT_MODEL_ALWAYS_ATTEMPT: "PLANT_MODEL_ALWAYS_ATTEMPT",
    PLANT_MODEL_SUPPORTED_PLANTS: "PLANT_MODEL_SUPPORTED_PLANTS",
    GEMINI_SCAN_ENABLED: "GEMINI_SCAN_ENABLED",
    IMAGE_VALIDATION_ENABLED: "IMAGE_VALIDATION_ENABLED",
    PLANT_CHECK_CONFIDENCE_THRESHOLD: "PLANT_CHECK_CONFIDENCE_THRESHOLD",
} as const;

const DEFAULT_HF_URL =
    "https://mahmoudtharwat-plant-disease-api.hf.space";

const MODE_DESCRIPTIONS: Record<ScanDetectionMode, string> = {
    gemini_only: "Gemini فقط — لا يُستدعى نموذج HF",
    plant_model_only: "نموذج HF فقط — بدون Gemini (فشل النموذج = خطأ)",
    hybrid: "HF أولاً ثم Gemini عند الحاجة (توفير تكلفة)",
};

const parseMode = (value?: string): ScanDetectionMode => {
    if (
        value === "gemini_only" ||
        value === "plant_model_only" ||
        value === "hybrid"
    ) {
        return value;
    }
    return "hybrid";
};

const parseBool = (value: string | undefined, defaultValue: boolean) => {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true";
};

const parseFloatSafe = (value: string | undefined, fallback: number) => {
    const n = parseFloat(value ?? "");
    return Number.isFinite(n) ? n : fallback;
};

/** يقرأ إعدادات التشخيص من DB / .env */
export const getScanDetectionSettings =
    async (): Promise<ScanDetectionSettings> => {
        const mode = parseMode(await getConfig(SCAN_DETECTION_CONFIG_KEYS.MODE, "hybrid"));
        const plantUrl =
            (await getConfig(SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_URL)) ??
            DEFAULT_HF_URL;
        const plantEnabled = parseBool(
            await getConfig(SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_ENABLED, "true"),
            mode !== "gemini_only",
        );
        const supportedRaw = await getConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_SUPPORTED_PLANTS,
            "",
        );
        const geminiEnabled = parseBool(
            await getConfig(SCAN_DETECTION_CONFIG_KEYS.GEMINI_SCAN_ENABLED, "true"),
            mode !== "plant_model_only",
        );

        return {
            mode,
            plantModel: {
                enabled: plantEnabled && mode !== "gemini_only",
                url: plantUrl,
                confidenceThreshold: parseFloatSafe(
                    await getConfig(
                        SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_CONFIDENCE_THRESHOLD,
                        "0.75",
                    ),
                    0.75,
                ),
                diseaseConfidenceThreshold: parseFloatSafe(
                    await getConfig(
                        SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_DISEASE_CONFIDENCE_THRESHOLD,
                        "0.7",
                    ),
                    0.7,
                ),
                alwaysAttempt: parseBool(
                    await getConfig(
                        SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_ALWAYS_ATTEMPT,
                        "true",
                    ),
                    true,
                ),
                supportedPlants: supportedRaw
                    ? supportedRaw
                          .split(",")
                          .map((p) => p.trim().toLowerCase())
                          .filter(Boolean)
                    : [],
            },
            gemini: {
                enabled: geminiEnabled && mode !== "plant_model_only",
                model: "gemini-2.5-flash",
            },
            imageValidation: {
                enabled: parseBool(
                    await getConfig(SCAN_DETECTION_CONFIG_KEYS.IMAGE_VALIDATION_ENABLED, "true"),
                    true,
                ),
                confidenceThreshold: parseFloatSafe(
                    await getConfig(
                        SCAN_DETECTION_CONFIG_KEYS.PLANT_CHECK_CONFIDENCE_THRESHOLD,
                        "0.7",
                    ),
                    0.7,
                ),
            },
        };
    };

/** يقرأ إعدادات التحقق من الصورة فقط (يُستخدم من imageValidation service) */
export const getImageValidationSettings =
    async (): Promise<ImageValidationSettings> => {
        const settings = await getScanDetectionSettings();
        return settings.imageValidation;
    };

export const getScanDetectionMode = async (): Promise<ScanDetectionMode> => {
    const settings = await getScanDetectionSettings();
    return settings.mode;
};

/** يحدّث الإعدادات ويطبّقها فوراً على process.env */
export const updateScanDetectionSettings = async (
    input: ScanDetectionSettingsUpdate,
): Promise<ScanDetectionSettings & { description: string }> => {
    if (input.mode === "plant_model_only" && input.geminiEnabled === true) {
        throw new appError(
            "Cannot enable Gemini when mode is plant_model_only",
            400,
        );
    }

    if (input.mode === "gemini_only" && input.geminiEnabled === false) {
        throw new appError("Gemini must stay enabled in gemini_only mode", 400);
    }

    const plantEnabled = input.mode !== "gemini_only";
    const geminiEnabled =
        input.mode === "plant_model_only"
            ? false
            : (input.geminiEnabled ?? true);

    await setConfig(
        SCAN_DETECTION_CONFIG_KEYS.MODE,
        input.mode,
        "Scan detection mode: gemini_only | plant_model_only | hybrid",
    );
    await setConfig(
        SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_ENABLED,
        String(plantEnabled),
        "Enable HF plant disease model",
    );
    await setConfig(
        SCAN_DETECTION_CONFIG_KEYS.GEMINI_SCAN_ENABLED,
        String(geminiEnabled),
        "Enable Gemini for scan fallback or primary",
    );

    if (input.plantModelUrl !== undefined) {
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_URL,
            input.plantModelUrl.replace(/\/$/, ""),
            "HF Space / plant model API URL",
        );
    }

    if (input.confidenceThreshold !== undefined) {
        if (input.confidenceThreshold < 0 || input.confidenceThreshold > 1) {
            throw new appError("confidenceThreshold must be between 0 and 1", 400);
        }
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_CONFIDENCE_THRESHOLD,
            String(input.confidenceThreshold),
            "Overall confidence threshold for plant model",
        );
    }

    if (input.diseaseConfidenceThreshold !== undefined) {
        if (
            input.diseaseConfidenceThreshold < 0 ||
            input.diseaseConfidenceThreshold > 1
        ) {
            throw new appError(
                "diseaseConfidenceThreshold must be between 0 and 1",
                400,
            );
        }
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_DISEASE_CONFIDENCE_THRESHOLD,
            String(input.diseaseConfidenceThreshold),
            "Per-disease confidence threshold",
        );
    }

    if (input.alwaysAttempt !== undefined) {
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_ALWAYS_ATTEMPT,
            String(input.alwaysAttempt),
            "Always call plant model (academic requirement)",
        );
    }

    if (input.supportedPlants !== undefined) {
        const normalized = input.supportedPlants
            .map((p) => p.trim().toLowerCase())
            .filter(Boolean)
            .join(",");
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_MODEL_SUPPORTED_PLANTS,
            normalized,
            "Comma-separated supported plant types",
        );
    }

    if (input.imageValidationEnabled !== undefined) {
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.IMAGE_VALIDATION_ENABLED,
            String(input.imageValidationEnabled),
            "Enable plant image pre-validation (reject non-plant images)",
        );
    }

    if (input.plantCheckConfidenceThreshold !== undefined) {
        if (
            input.plantCheckConfidenceThreshold < 0 ||
            input.plantCheckConfidenceThreshold > 1
        ) {
            throw new appError(
                "plantCheckConfidenceThreshold must be between 0 and 1",
                400,
            );
        }
        await setConfig(
            SCAN_DETECTION_CONFIG_KEYS.PLANT_CHECK_CONFIDENCE_THRESHOLD,
            String(input.plantCheckConfidenceThreshold),
            "Confidence threshold for plant image pre-check",
        );
    }

    const settings = await getScanDetectionSettings();
    return {
        ...settings,
        description: MODE_DESCRIPTIONS[settings.mode],
    };
};

export const getModeDescriptions = () => ({ ...MODE_DESCRIPTIONS });
