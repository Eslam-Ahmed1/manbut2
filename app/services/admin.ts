import Product from "../models/product.js";
import Order from "../models/orders.js";
import User from "../models/user.js";
import { appError } from "../../utils/appErrors.js";
import { uploadToCloudinary } from "../../utils/helpFuncitons.js";
import Treatment from "../models/treatments.js";
import Disease from "../models/diseases.js";
import Category from "../models/categories.js";
import ProductCategory from "../models/productCategory.js";
import Article from "../models/articles.js";
import { paginate } from "../../utils/pagination.js";
import { sendOrderStatusEmail } from "./email.js";

// --- PRODUCT MANAGEMENT ---
interface IProductData {
    treatmentName?: string;
    categoryName?: string;
    productName?: string;
    description?: string;
    price?: number;
    quantity?: number;
    discount?: number;
}
export const createProduct = async (imageBuffer: Buffer | undefined, productData: IProductData) => {
    let treatmentId = null;
    if (productData.treatmentName) {
        const treatment = await Treatment.findOne({ name: productData.treatmentName });
        if (!treatment) throw new appError('Treatment name does not exist or is incorrect', 400);
        treatmentId = treatment._id;
    }
    let imageUrl = "";
    if (!imageBuffer) throw new appError("please upload product image", 400);
    try {
        const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_plant_scans");
        imageUrl = uploadResult.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new appError("Failed to upload image to Cloudinary", 500);
    }
    const product = new Product({
        name: productData.productName,
        description: productData.description,
        price: productData.price,
        quantity: productData.quantity,
        discount: productData.discount,
        treatment_id: treatmentId,
        image_url: imageUrl || undefined
    });
    if (productData.categoryName) {
        const category = await ProductCategory.findOne({ name: { $regex: productData.categoryName, $options: 'i' } });
        if (category) {
            product.product_category_id = category._id;
        }
    }
    await product.save();
    return await product.populate([
        { path: 'treatment_id', select: 'name' },
        { path: 'product_category_id', select: 'name' }
    ]);
};

export const updateProduct = async (id: string, imageBuffer: Buffer | undefined, productData: Partial<IProductData>) => {
    const updatePayload: any = {};

    if (productData.productName !== undefined) updatePayload.name = productData.productName;
    if (productData.description !== undefined) updatePayload.description = productData.description;
    if (productData.price !== undefined) updatePayload.price = productData.price;
    if (productData.quantity !== undefined) updatePayload.quantity = productData.quantity;
    if (productData.discount !== undefined) updatePayload.discount = productData.discount;

    if (productData.categoryName) {
        const category = await ProductCategory.findOne({ name: { $regex: productData.categoryName, $options: 'i' } });
        if (!category) throw new appError('Category name does not exist', 400);
        updatePayload.product_category_id = category._id;
    } else if (productData.categoryName === null) {
        updatePayload.product_category_id = null;
    }

    if (productData.treatmentName) {
        const treatment = await Treatment.findOne({ name: productData.treatmentName });
        if (!treatment) throw new appError('Treatment name does not exist or is incorrect', 400);
        updatePayload.treatment_id = treatment._id;
    }

    if (imageBuffer) {
        try {
            const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_plant_scans");
            updatePayload.image_url = uploadResult.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            throw new appError("Failed to upload image to Cloudinary", 500);
        }
    }

    const product = await Product.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true })
        .populate([
            { path: 'treatment_id', select: 'name' },
            { path: 'product_category_id', select: 'name' }
        ]);
    if (!product) throw new appError("Product not found", 404);
    return product;
};



export const deleteProduct = async (id: string) => {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new appError("Product not found", 404);
    return product;
};

// --- ORDER MANAGEMENT ---
export const getAllOrders = async (query: any = {}) => {
    const result = await paginate<any>(Order, {}, {
        page: query.page,
        limit: query.limit,
        sort: { createdAt: -1 },
        populate: [
            { path: 'user_id', select: 'name email address phone' },
            { path: 'items.product_id', select: 'name price' }
        ]
    });

    return {
        orders: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalOrders: result.totalItems
    };
};

export const updateOrderStatus = async (orderId: string, status: string) => {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) throw new appError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);

    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true }).populate('user_id');
    if (!order) throw new appError("Order not found", 404);

    if (status == 'cancelled') {
        for (const item of order.items) {
            const product = await Product.findById(item.product_id);
            if (!product) throw new appError(`Product not found`, 404);
            if (product.quantity < item.quantity) throw new appError(`Insufficient stock for product: ${product.name}`, 400);

            product.quantity += item.quantity;
            await product.save();
        }
    }
    const user: any = order.user_id;
    if (user && user.email) {
        try {
            await sendOrderStatusEmail(user.email, user.name, order._id.toString(), status);
        } catch (error) {
            console.error("Failed to send order status email:", error);
        }
    }

    return order;
};

// --- DASHBOARD STATS ---
export const getDashboardStats = async () => {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();

    // Fetch only delivered orders directly from MongoDB for better performance
    const deliveredOrders = await Order.find({ status: 'delivered' });
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total_amount, 0);

    return { totalProducts, totalOrders, totalUsers, totalRevenue };
};

// --- USER MANAGEMENT ---
export const getAllUsers = async (query: any = {}) => {
    const result = await paginate<any>(User, {isEmailVerified: true}, {
        // The 'condition' property is not a standard option for paginate.
        // Assuming the intention was to filter by isEmailVerified,
        // the condition should be passed as the second argument to paginate.
        page: query.page,
        limit: query.limit,
        select: '-password',
        sort: { created_at: -1 }
    });

    return {
        users: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalUsers: result.totalItems
    };
};

export const updateUserRole = async (userId: string, role: string) => {
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
        throw new appError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) throw new appError("User not found", 404);
    return user;
};

export const deleteUser = async (userId: string) => {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new appError("User not found", 404);
    return user;
};

// --- DISEASE MANAGEMENT ---
interface IDiseaseData {
    name: string;
    description: string;
}

export const createDisease = async (diseaseData: IDiseaseData) => {
    const existingDisease = await Disease.findOne({ name: diseaseData.name });
    if (existingDisease) {
        throw new appError("Disease with this name already exists", 400);
    }

    const disease = new Disease(diseaseData);
    return await disease.save();
};

export const updateDisease = async (diseaseId: string, diseaseData: Partial<IDiseaseData>) => {
    if (diseaseData.name) {
        const existingDisease = await Disease.findOne({
            name: diseaseData.name,
            _id: { $ne: diseaseId }
        });
        if (existingDisease) {
            throw new appError("Disease with this name already exists", 400);
        }
    }

    const disease = await Disease.findByIdAndUpdate(
        diseaseId,
        diseaseData,
        { new: true, runValidators: true }
    );

    if (!disease) throw new appError("Disease not found", 404);
    return disease;
};

export const deleteDisease = async (diseaseId: string) => {
    // Check if disease is used in any treatment
    const treatmentUsingDisease = await Treatment.findOne({ disease_ids: diseaseId });
    if (treatmentUsingDisease) {
        throw new appError("Cannot delete disease. It is being used in treatments", 400);
    }

    const disease = await Disease.findByIdAndDelete(diseaseId);
    if (!disease) throw new appError("Disease not found", 404);
    return disease;
};

export const getAllDiseases = async (query: any = {}) => {
    const result = await paginate<any>(Disease, {}, {
        page: query.page,
        limit: query.limit,
        sort: { name: 1 }
    });

    return {
        diseases: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalDiseases: result.totalItems
    };
};

// --- TREATMENT MANAGEMENT ---
interface ITreatmentData {
    name: string;
    instructions?: string;
    disease_ids?: string[];
}

export const createTreatment = async (treatmentData: ITreatmentData) => {
    const existingTreatment = await Treatment.findOne({ name: treatmentData.name });
    if (existingTreatment) {
        throw new appError("Treatment with this name already exists", 400);
    }

    // Validate disease IDs if provided
    if (treatmentData.disease_ids && treatmentData.disease_ids.length > 0) {
        const diseases = await Disease.find({ _id: { $in: treatmentData.disease_ids } });
        if (diseases.length !== treatmentData.disease_ids.length) {
            throw new appError("One or more disease IDs are invalid", 400);
        }
    }

    const treatment = new Treatment(treatmentData);
    return await treatment.save();
};

export const updateTreatment = async (treatmentId: string, treatmentData: Partial<ITreatmentData>) => {
    if (treatmentData.name) {
        const existingTreatment = await Treatment.findOne({
            name: treatmentData.name,
            _id: { $ne: treatmentId }
        });
        if (existingTreatment) {
            throw new appError("Treatment with this name already exists", 400);
        }
    }

    // Validate disease IDs if provided
    if (treatmentData.disease_ids && treatmentData.disease_ids.length > 0) {
        const diseases = await Disease.find({ _id: { $in: treatmentData.disease_ids } });
        if (diseases.length !== treatmentData.disease_ids.length) {
            throw new appError("One or more disease IDs are invalid", 400);
        }
    }

    const treatment = await Treatment.findByIdAndUpdate(
        treatmentId,
        treatmentData,
        { new: true, runValidators: true }
    ).populate('disease_ids');

    if (!treatment) throw new appError("Treatment not found", 404);
    return treatment;
};

export const deleteTreatment = async (treatmentId: string) => {
    // Check if treatment is used in any product
    const productUsingTreatment = await Product.findOne({ treatment_id: treatmentId });
    if (productUsingTreatment) {
        throw new appError("Cannot delete treatment. It is being used in products", 400);
    }

    const treatment = await Treatment.findByIdAndDelete(treatmentId);
    if (!treatment) throw new appError("Treatment not found", 404);
    return treatment;
};

export const getAllTreatments = async (query: any = {}) => {
    const result = await paginate<any>(Treatment, {}, {
        page: query.page,
        limit: query.limit,
        populate: 'disease_ids',
        sort: { name: 1 }
    });

    return {
        treatments: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalTreatments: result.totalItems
    };
};

// --- CATEGORY MANAGEMENT ---
interface ICategoryData {
    name: string;
}

export const createCategory = async (categoryData: ICategoryData) => {
    const existingCategory = await Category.findOne({ name: categoryData.name });
    if (existingCategory) {
        throw new appError("Category with this name already exists", 400);
    }

    const category = new Category(categoryData);
    return await category.save();
};

export const updateCategory = async (categoryId: string, categoryData: Partial<ICategoryData>) => {
    if (categoryData.name) {
        const existingCategory = await Category.findOne({
            name: categoryData.name,
            _id: { $ne: categoryId }
        });
        if (existingCategory) {
            throw new appError("Category with this name already exists", 400);
        }
    }

    const category = await Category.findByIdAndUpdate(
        categoryId,
        categoryData,
        { new: true, runValidators: true }
    );

    if (!category) throw new appError("Category not found", 404);
    return category;
};

export const deleteCategory = async (categoryId: string) => {
    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) throw new appError("Category not found", 404);
    return category;
};

export const getAllCategories = async (query: any = {}) => {
    const result = await paginate<any>(Category, {}, {
        page: query.page,
        limit: query.limit,
        sort: { name: 1 }
    });

    return {
        categories: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCategories: result.totalItems
    };
};

// --- ADVANCED ANALYTICS ---
export const getAdvancedAnalytics = async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recent orders (last 30 days)
    const recentOrders = await Order.find({
        createdAt: { $gte: thirtyDaysAgo }
    });

    // Orders by status
    const ordersByStatus = await Order.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Revenue last 7 days vs previous 7 days
    const last7DaysRevenue = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: sevenDaysAgo },
                status: 'delivered'
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$total_amount' }
            }
        }
    ]);

    const previous7DaysRevenue = await Order.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
                    $lt: sevenDaysAgo
                },
                status: 'delivered'
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$total_amount' }
            }
        }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.product_id',
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' }
    ]);

    // New users (last 30 days)
    const newUsers = await User.countDocuments({
        created_at: { $gte: thirtyDaysAgo }
    });

    // Low stock products
    const lowStockProducts = await Product.find({ quantity: { $lt: 10 } })
        .sort({ quantity: 1 })
        .limit(10);

    return {
        recentOrdersCount: recentOrders.length,
        ordersByStatus,
        last7DaysRevenue: last7DaysRevenue[0]?.total || 0,
        previous7DaysRevenue: previous7DaysRevenue[0]?.total || 0,
        revenueGrowth: previous7DaysRevenue[0]?.total
            ? ((last7DaysRevenue[0]?.total || 0) - previous7DaysRevenue[0].total) / previous7DaysRevenue[0].total * 100
            : 0,
        topProducts,
        newUsers,
        lowStockProducts
    };
};

export const getRevenueByPeriod = async (startDate?: string, endDate?: string) => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueData = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end },
                status: 'delivered'
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                totalRevenue: { $sum: '$total_amount' },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return revenueData;
};

// --- PLANT MANAGEMENT ---
import Plant from "../models/Plants.js";

interface IPlantData {
    name: string;
    categoryName?: string;
}

export const createPlant = async (imageBuffer: Buffer, plantData: IPlantData) => {
    let categoryId = null;

    if (plantData.categoryName) {
        const category = await Category.findOne({ name: plantData.categoryName });
        if (!category) throw new appError('Category name does not exist or is incorrect', 400);
        categoryId = category._id;
    }

    let imageUrl = "";
    try {
        const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_plants");
        imageUrl = uploadResult.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new appError("Failed to upload image to Cloudinary", 500);
    }

    const plant = new Plant({
        name: plantData.name,
        category_id: categoryId,
        image_url: imageUrl
    });

    return await plant.save();
};

export const updatePlant = async (plantId: string, imageBuffer: Buffer | undefined, plantData: Partial<IPlantData>) => {
    const updatePayload: any = {};

    if (plantData.name) updatePayload.name = plantData.name;

    if (plantData.categoryName) {
        const category = await Category.findOne({ name: plantData.categoryName });
        if (!category) throw new appError('Category name does not exist or is incorrect', 400);
        updatePayload.category_id = category._id;
    }

    if (imageBuffer) {
        try {
            const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_plants");
            updatePayload.image_url = uploadResult.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            throw new appError("Failed to upload image to Cloudinary", 500);
        }
    }

    const plant = await Plant.findByIdAndUpdate(plantId, updatePayload, { new: true, runValidators: true })
        .populate('category_id');
    if (!plant) throw new appError("Plant not found", 404);
    return plant;
};

export const deletePlant = async (plantId: string) => {
    const plant = await Plant.findByIdAndDelete(plantId);
    if (!plant) throw new appError("Plant not found", 404);
    return plant;
};

export const getAllPlants = async (query: any = {}) => {
    const result = await paginate<any>(Plant, {}, {
        page: query.page,
        limit: query.limit,
        populate: 'category_id',
        sort: { name: 1 }
    });

    return {
        plants: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalPlants: result.totalItems
    };
};

// --- ARTICLE MANAGEMENT ---
interface IArticleData {
    title: string;
    summary?: string;
    content: string;
    plantId?: string | null;
    tags?: string[];
    status?: 'draft' | 'published';
}

const buildArticlePayload = async (articleData: Partial<IArticleData>) => {
    const payload: any = {};

    if (articleData.title) payload.title = articleData.title;
    if (articleData.summary !== undefined) payload.summary = articleData.summary;
    if (articleData.content) payload.content = articleData.content;
    if (articleData.tags) payload.tags = articleData.tags;
    if (articleData.plantId !== undefined) {
        if (articleData.plantId === null || articleData.plantId === '') {
            payload.plant_id = null;
        } else {
            const plant = await Plant.findById(articleData.plantId);
            if (!plant) throw new appError("Plant not found", 404);
            payload.plant_id = plant._id;
        }
    }
    if (articleData.status) {
        payload.status = articleData.status;
        if (articleData.status === 'published') payload.published_at = new Date();
        if (articleData.status === 'draft') payload.published_at = null;
    }

    return payload;
};

export const createArticle = async (imageBuffer: Buffer | undefined, articleData: IArticleData) => {
    const payload = await buildArticlePayload(articleData);

    if (imageBuffer) {
        try {
            const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_articles");
            payload.image_url = uploadResult.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            throw new appError("Failed to upload image to Cloudinary", 500);
        }
    }

    const article = new Article(payload);
    await article.save();
    return await article.populate('plant_id', 'name image_url');
};

export const updateArticle = async (articleId: string, imageBuffer: Buffer | undefined, articleData: Partial<IArticleData>) => {
    const updatePayload = await buildArticlePayload(articleData);

    if (imageBuffer) {
        try {
            const uploadResult = await uploadToCloudinary(imageBuffer, "manbut_articles");
            updatePayload.image_url = uploadResult.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            throw new appError("Failed to upload image to Cloudinary", 500);
        }
    }

    const article = await Article.findByIdAndUpdate(articleId, updatePayload, { new: true, runValidators: true })
        .populate('plant_id', 'name image_url');
    if (!article) throw new appError("Article not found", 404);
    return article;
};

export const deleteArticle = async (articleId: string) => {
    const article = await Article.findByIdAndDelete(articleId);
    if (!article) throw new appError("Article not found", 404);
    return article;
};

export const getAllArticles = async (query: any = {}) => {
    const result = await paginate<any>(Article, {}, {
        page: query.page,
        limit: query.limit,
        populate: { path: 'plant_id', select: 'name image_url' },
        sort: { createdAt: -1 }
    });

    return {
        articles: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalArticles: result.totalItems
    };
};

export const getArticleById = async (articleId: string) => {
    const article = await Article.findById(articleId).populate('plant_id', 'name image_url');
    if (!article) throw new appError("Article not found", 404);
    return article;
};

// --- PLANT SCAN MANAGEMENT ---
import PlantScan from "../models/plantScans.js";

export const getAllScans = async (query: any = {}) => {
    const result = await paginate<any>(PlantScan, {}, {
        page: query.page,
        limit: query.limit,
        populate: [
            { path: 'user_id', select: 'name email' },
            { path: 'plant_id', select: 'name' },
            { path: 'disease_ids' }
        ],
        sort: { scan_date: -1 }
    });

    return {
        scans: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalScans: result.totalItems
    };
};

export const getScanById = async (scanId: string) => {
    const scan = await PlantScan.findById(scanId)
        .populate('user_id', 'name email phone')
        .populate('plant_id', 'name image_url')
        .populate('disease_ids');

    if (!scan) throw new appError("Scan not found", 404);
    return scan;
};

export const deleteScan = async (scanId: string) => {
    const scan = await PlantScan.findByIdAndDelete(scanId);
    if (!scan) throw new appError("Scan not found", 404);
    return scan;
};

// --- AI SCAN STATISTICS ---
export const getAIScanStats = async () => {
    const totalScans = await PlantScan.countDocuments();
    const completedScans = await PlantScan.countDocuments({ status: 'completed' });
    const failedScans = await PlantScan.countDocuments({ status: 'failed' });
    const pendingScans = await PlantScan.countDocuments({ status: 'pending' });

    // Scans in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentScans = await PlantScan.countDocuments({
        scan_date: { $gte: thirtyDaysAgo }
    });

    // Most detected diseases
    const topDiseases = await PlantScan.aggregate([
        { $unwind: '$disease_ids' },
        {
            $group: {
                _id: '$disease_ids',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'diseases',
                localField: '_id',
                foreignField: '_id',
                as: 'disease'
            }
        },
        { $unwind: '$disease' }
    ]);

    // Scans per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const scansPerDay = await PlantScan.aggregate([
        {
            $match: {
                scan_date: { $gte: sevenDaysAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$scan_date' },
                    month: { $month: '$scan_date' },
                    day: { $dayOfMonth: '$scan_date' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Healthy vs diseased scans
    const healthyScans = await PlantScan.countDocuments({
        disease_ids: { $size: 0 },
        status: 'completed'
    });
    const diseasedScans = completedScans - healthyScans;

    return {
        totalScans,
        completedScans,
        failedScans,
        pendingScans,
        recentScans,
        healthyScans,
        diseasedScans,
        healthyPercentage: completedScans > 0 ? (healthyScans / completedScans * 100).toFixed(2) : 0,
        topDiseases,
        scansPerDay
    };
};

import { exec } from 'child_process';
import { promisify } from 'util';
import { isWeakMap } from "util/types";
const execPromise = promisify(exec);

export const runDatabaseSeeds = async () => {
    const logs: string[] = [];

    try {
        logs.push("Starting Master Database Seeding Orchestration...");
        const { stdout, stderr } = await execPromise('npx tsx seeds/seed.ts');
        logs.push(stdout);
        if (stderr) logs.push(`Warning/Error: ${stderr}`);

        return {
            success: true,
            message: "Database seeded successfully!",
            logs: logs.join('\n')
        };
    } catch (error: any) {
        console.error("Seeding failed:", error);
        return {
            success: false,
            message: "Database seeding failed!",
            error: error.message || error,
            logs: logs.join('\n') + `\n❌ Critical Error: ${error.stdout || error.message || error}`
        };
    }
};
