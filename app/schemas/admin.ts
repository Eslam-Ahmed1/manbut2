import { z } from 'zod';

// Product Schemas
export const createProductSchema = z.object({
    body: z.object({
        treatmentName: z.string().optional(),
        categoryName: z.string().optional(),
        productName: z.string().min(1, "Product name is required"),
        description: z.string().min(10, "Description must be at least 10 characters"),
        price: z.string().transform(val => parseFloat(val)).refine(val => val >= 0, "Price must be non-negative"),
        quantity: z.string().transform(val => parseInt(val)).refine(val => val >= 0, "Quantity must be non-negative"),
        discount: z.string().optional().transform(val => val ? parseFloat(val) : 0)
    })
});

export const updateProductSchema = z.object({
    body: z.object({
        treatmentName: z.string().optional(),
        categoryName: z.string().optional(),
        productName: z.string().min(1).optional(),
        description: z.string().min(10).optional(),
        price: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
        quantity: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        discount: z.string().optional().transform(val => val ? parseFloat(val) : undefined)
    })
});

// Product Category Schemas
export const createProductCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, "Category name is required"),
        description: z.string().optional(),
        image_url: z.string().optional()
    })
});

export const updateProductCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        image_url: z.string().optional()
    })
});

// Order Schemas
export const updateOrderStatusSchema = z.object({
    body: z.object({
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    })
});

// User Schemas
export const updateUserRoleSchema = z.object({
    body: z.object({
        role: z.enum(['user', 'admin'])
    })
});

// Disease Schemas
export const createDiseaseSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Disease name is required"),
        description: z.string().min(10, "Description must be at least 10 characters")
    })
});

export const updateDiseaseSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().min(10).optional()
    })
});

// Treatment Schemas
export const createTreatmentSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Treatment name is required"),
        instructions: z.string().optional(),
        disease_ids: z.array(z.string()).optional()
    })
});

export const updateTreatmentSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        instructions: z.string().optional(),
        disease_ids: z.array(z.string()).optional()
    })
});

// Category Schemas
export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, "Category name is required")
    })
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1).optional()
    })
});

// Revenue Query Schema
export const revenueQuerySchema = z.object({
    query: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
    })
});

// Plant Schemas
export const createPlantSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Plant name is required"),
        categoryName: z.string().optional()
    })
});

export const updatePlantSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        categoryName: z.string().optional()
    })
});

const tagsSchema = z.union([
    z.string().transform(value => value.split(',').map(tag => tag.trim()).filter(Boolean)),
    z.array(z.string().min(1))
]).optional();

/** General article = no plant (null). Multipart may send "" or omit the field. */
const optionalPlantIdSchema = z
    .string()
    .optional()
    .transform((val) => {
        if (val === undefined) return undefined;
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed;
    });

// Article Schemas
export const createArticleSchema = z.object({
    body: z.object({
        title: z.string().min(1, "Article title is required"),
        summary: z.string().optional(),
        content: z.string().min(10, "Content must be at least 10 characters"),
        plantId: optionalPlantIdSchema,
        tags: tagsSchema,
        status: z.enum(['draft', 'published']).optional()
    })
});

export const updateArticleSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        summary: z.string().optional(),
        content: z.string().min(10).optional(),
        plantId: optionalPlantIdSchema,
        tags: tagsSchema,
        status: z.enum(['draft', 'published']).optional()
    })
});

// Scan detection model settings
export const updateScanDetectionSettingsSchema = z.object({
    body: z.object({
        mode: z.enum(["gemini_only", "plant_model_only", "hybrid"]),
        plantModelUrl: z.string().url().optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        diseaseConfidenceThreshold: z.number().min(0).max(1).optional(),
        alwaysAttempt: z.boolean().optional(),
        supportedPlants: z.array(z.string().min(1)).optional(),
        geminiEnabled: z.boolean().optional(),
        imageValidationEnabled: z.boolean().optional(),
        plantCheckConfidenceThreshold: z.number().min(0).max(1).optional(),
    }),
});

