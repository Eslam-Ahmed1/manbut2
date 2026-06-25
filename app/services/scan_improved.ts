import { GoogleGenerativeAI } from "@google/generative-ai";
import Disease from "../models/diseases.js";
import PlantScan from "../models/plantScans.js";
import { appError } from "../../utils/appErrors.js";
import Treatment from "../models/treatments.js";
import Product from "../models/product.js";
import { uploadToCloudinary } from "../../utils/helpFuncitons.js";

const getAIModel = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new appError("Server configuration error: GEMINI_API_KEY is missing", 500);
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
};


const analyzePlantImageImproved = async (userId: string, imageBuffer: Buffer, mimeType: string) => {
    try {
        const model = getAIModel();
        
        const knownDiseases = await Disease.find().select('name description');
        const diseaseList = knownDiseases.map(d => `- ${d.name}: ${d.description}`).join('\n');
        
  
        const prompt = `
You are a plant disease detection expert. Analyze this plant image and identify diseases.

KNOWN DISEASES IN OUR DATABASE:
${diseaseList}

INSTRUCTIONS:
1. If the plant is healthy, return []
2. If you detect a disease, try to match it with our known diseases list
3. Return ONLY disease detection, NOT treatment suggestions

Return a JSON array with this structure:
[
  {
    "diseaseName": "exact name from our database OR new disease name",
    "confidence": 0-100 (how confident you are),
    "severity": "mild" | "moderate" | "severe",
    "affectedArea": "leaves" | "stem" | "roots" | "flowers" | "fruits",
    "symptoms": ["symptom1", "symptom2"],
    "isNewDisease": true/false (true if not in our database)
  }
]

If multiple diseases detected, include all of them.
`;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: mimeType
            }
        };

    
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        const detectedDiseases: Array<{
            diseaseName: string;
            confidence: number;
            severity: string;
            affectedArea: string;
            symptoms: string[];
            isNewDisease: boolean;
        }> = JSON.parse(responseText);


        const diseaseIds = [];
        const treatmentsWithProducts = [];
        
        for (const detected of detectedDiseases) {
            let diseaseRecord = await Disease.findOne({ 
                name: { $regex: new RegExp(`^${detected.diseaseName}$`, 'i') } 
            });

            if (!diseaseRecord && detected.isNewDisease) {
                diseaseRecord = new Disease({ 
                    name: detected.diseaseName,
                    description: `Auto-detected: ${detected.symptoms.join(', ')}`
                });
                await diseaseRecord.save();
                
                console.log(` New disease detected: ${detected.diseaseName}`);
            }

            if (!diseaseRecord) {
                console.log(` Disease not found: ${detected.diseaseName}`);
                continue;
            }

            diseaseIds.push(diseaseRecord._id);

            const treatments = await Treatment.find({ 
                disease_ids: { $in: [diseaseRecord._id] } 
            }).sort({ name: 1 });

            for (const treatment of treatments) {
                const products = await Product.find({
                    treatment_id: treatment._id,
                    quantity: { $gt: 0 },
                    isAvailable: true
                }).sort({
                    priority: -1,
                    isRecommended: -1,
                    effectiveness: -1,
                    rating: -1,
                    price: 1
                });

                treatmentsWithProducts.push({
                    disease: {
                        _id: diseaseRecord._id,
                        name: diseaseRecord.name,
                        description: diseaseRecord.description,
                        // AI detection info
                        confidence: detected.confidence,
                        severity: detected.severity,
                        affectedArea: detected.affectedArea,
                        symptoms: detected.symptoms
                    },
                    treatment: {
                        _id: treatment._id,
                        name: treatment.name,
                        instructions: treatment.instructions
                    },
                    products: products.map(p => ({
                        _id: p._id,
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        quantity: p.quantity,
                        image_url: p.image_url,
                        brand: (p as any).brand,
                        type: (p as any).type,
                        effectiveness: (p as any).effectiveness,
                        rating: (p as any).rating,
                        reviewsCount: (p as any).reviewsCount,
                        isRecommended: (p as any).isRecommended,
                        tags: (p as any).tags
                    })),
                    hasProducts: products.length > 0
                });
            }
        }

        let imageUrl = "";
        try {
            const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_plant_scans");
            imageUrl = uploadResult.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
        }

        const newScan = new PlantScan({
            user_id: userId,
            status: 'completed',
            image_url: imageUrl,
            disease_ids: diseaseIds
        });
        await newScan.save();
        return {
            scan: await PlantScan.findById(newScan._id).populate('disease_ids'),
            detectedDiseases: treatmentsWithProducts,
            summary: {
                totalDiseases: detectedDiseases.length,
                totalTreatments: treatmentsWithProducts.length,
                totalAvailableProducts: treatmentsWithProducts.reduce((sum, t) => sum + t.products.length, 0),
                hasAllProducts: treatmentsWithProducts.every(t => t.hasProducts),
                averageConfidence: detectedDiseases.reduce((sum, d) => sum + d.confidence, 0) / detectedDiseases.length || 0
            }
        };
    } catch (error: any) {
        console.log(error);
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

export { analyzePlantImageImproved };
