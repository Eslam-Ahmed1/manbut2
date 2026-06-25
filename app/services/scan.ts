import PlantScan from "../models/plantScans.js";

import { appError } from "../../utils/appErrors.js";
import logger from "../../utils/logger.js";

import { validateAndVerifyImage } from "./imageValidation.js";

import {

    buildNewDiseaseScanEntry,

    findDiseaseByName,

    getTreatmentsWithProductsForDiseaseIds,

    optimizeScanDetectedEntries,

    persistNewDiseaseWithTreatment,

} from "./treatment.js";

import { detectDiseasesFromImage } from "./diseaseDetection.js";

import { uploadToCloudinary } from "../../utils/helpFuncitons.js";

import { paginate } from "../../utils/pagination.js";



const analyzePlantImage = async (userId: string, imageBuffer: Buffer, mimeType: string) => {

    const startTime = Date.now();

    logger.debug(`\n🔍 [SCAN] Starting — user: ${userId}`);



    try {

        // 🛡️ Layer 1 + 2: Validate file & verify it's a plant image
        await validateAndVerifyImage(imageBuffer, mimeType);

        const { diseases: detectedDiseases, meta } = await detectDiseasesFromImage(

            imageBuffer,

            mimeType,

        );



        if (detectedDiseases.length === 0) {

            logger.debug(`   🌿 [SCAN] Plant is healthy — no diseases detected`);

        } else {

            logger.debug(

                `   🦠 [SCAN] Detected ${detectedDiseases.length} disease(s) via ${meta.source}: ${detectedDiseases.map((d) => d.name).join(", ")}`,

            );

        }



        const diseaseIds: unknown[] = [];

        const treatmentsWithProducts = [];



        for (const d of detectedDiseases) {

            logger.debug(`\n   📋 [SCAN] Processing: "${d.name}"`);



            const existingDisease = await findDiseaseByName(d.name);



            if (!existingDisease) {

                const { disease, treatment } = await persistNewDiseaseWithTreatment({

                    name: d.name,

                    description: d.description,

                    treatment: d.treatment,

                    instructions: d.instructions,

                });

                diseaseIds.push(disease._id);

                treatmentsWithProducts.push(

                    buildNewDiseaseScanEntry(disease, treatment),

                );

                logger.debug(`      🆕 New disease saved for future scans — response: names only, no products`);

                continue;

            }



            logger.debug(`      ✅ Disease found in DB: "${existingDisease.name}"`);

            diseaseIds.push(existingDisease._id);



            const diseaseTreatments = await getTreatmentsWithProductsForDiseaseIds([

                existingDisease._id.toString(),

            ]);

            const productCount = diseaseTreatments.reduce(

                (sum, t) => sum + t.products.length,

                0,

            );

            logger.debug(`      💊 Treatments in DB: ${diseaseTreatments.length}, products: ${productCount}`);



            treatmentsWithProducts.push(...diseaseTreatments);

        }



        const optimizedDetected = optimizeScanDetectedEntries(treatmentsWithProducts);



        let imageUrl = "";

        try {

            logger.debug(`\n   ⏳ [SCAN] Uploading to Cloudinary...`);

            const t2 = Date.now();

            const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_plant_scans");

            imageUrl = uploadResult.secure_url;

            logger.debug(`   ✅ [SCAN] Cloudinary done in ${Date.now() - t2}ms`);

        } catch (error) {

            logger.error(`   ❌ [SCAN] Cloudinary upload failed:`, error);

        }



        const newScan = new PlantScan({

            user_id: userId,

            status: "completed",

            image_url: imageUrl,

            disease_ids: diseaseIds,

        });

        await newScan.save();



        const totalProducts = optimizedDetected.reduce((s, t) => s + t.products.length, 0);

        logger.info(

            `✅ [SCAN] Complete — user: ${userId}, ${detectedDiseases.length} disease(s), source: ${meta.source} — ${Date.now() - startTime}ms`,

        );



        return {

            scan: await PlantScan.findById(newScan._id).populate("disease_ids"),

            detectedDiseases: optimizedDetected,

            summary: {

                totalDiseases: detectedDiseases.length,

                totalTreatments: optimizedDetected.length,

                totalAvailableProducts: totalProducts,

                hasAllProducts:

                    optimizedDetected.length > 0 &&

                    optimizedDetected.every((t) => t.hasProducts),

                detectionSource: meta.source,

                detectionMode: meta.detectionMode,

                customModelUsed: meta.customModelUsed,

                geminiUsed: meta.geminiUsed,

                plantType: meta.plantType,

                modelConfidence: meta.modelConfidence,

                modelDiseaseLabel: meta.modelDiseaseLabel,

            },

        };

    } catch (error: any) {

        logger.error(`❌ [SCAN] Failed after ${Date.now() - startTime}ms:`, error);

        if (error instanceof appError || (error && error.isOperational === true)) {
            throw error;
        }

        const wrappedError = new appError("Failed to analyze image or save to database", 500);
        if (error instanceof Error) {
            wrappedError.stack = error.stack;
        }
        throw wrappedError;

    }

};



const getScanHistory = async (userId: string, query: any = {}) => {

    const result = await paginate<any>(PlantScan, { user_id: userId }, {

        page: query.page,

        limit: query.limit,

        populate: "disease_ids",

        sort: { scan_date: -1 },

        lean: true,

    });



    const data = result.data;



    await Promise.all(

        data.map(async (scan: any) => {

            const extractedDiseaseIds: string[] = (scan.disease_ids || [])

                .filter((disease: any) => disease && disease._id)

                .map((disease: any) => disease._id.toString());



            scan.detectedDiseases =

                extractedDiseaseIds.length > 0

                    ? await getTreatmentsWithProductsForDiseaseIds(extractedDiseaseIds)

                    : [];

        }),

    );



    return {

        scans: data,

        currentPage: result.currentPage,

        totalPages: result.totalPages,

        totalScans: result.totalItems,

    };

};



const getScanById = async (scanId: string, userId: string) => {

    const scan = await PlantScan.findOne({ _id: scanId, user_id: userId }).populate(

        "disease_ids",

    );

    if (!scan) throw new appError("Scan not found", 404);



    const diseaseIds = (scan.disease_ids as any[])

        .filter((d) => d && d._id)

        .map((d) => d._id.toString());



    const detectedDiseases = await getTreatmentsWithProductsForDiseaseIds(diseaseIds);



    return {

        scan,

        detectedDiseases,

        summary: {

            totalDiseases: diseaseIds.length,

            totalTreatments: detectedDiseases.length,

            totalAvailableProducts: detectedDiseases.reduce(

                (s, t) => s + t.products.length,

                0,

            ),

            hasAllProducts: detectedDiseases.every((t) => t.hasProducts),

        },

    };

};



/** @deprecated use getScanById — kept for route compatibility */

const getScanHistoryByPlantId = getScanById;



export { analyzePlantImage, getScanHistory, getScanById, getScanHistoryByPlantId };
