import mongoose from 'mongoose';
import Disease from '../app/models/diseases.js';
import dotenv from 'dotenv';
dotenv.config();
const diseases = [
    {
        name: "Powdery Mildew",
        description: "A widespread fungal disease that appears as white or grayish powdery patches on the surface of leaves, stems, and sometimes flowers. It thrives in warm, dry climates with high humidity and reduces photosynthesis, stunting plant growth."
    },
    {
        name: "Downy Mildew",
        description: "A fungal-like (oomycete) disease causing yellow to brown angular patches on the upper leaf surface, with a fuzzy grayish-purple growth underneath. It thrives in cool, moist conditions and spreads rapidly via wind and water splashes."
    },
    {
        name: "Leaf Spot",
        description: "Brown, black, or tan circular spots appear on leaves due to fungal or bacterial pathogens. Severely infected leaves may yellow and drop prematurely, weakening the plant over time and reducing fruit or flower production."
    },
    {
        name: "Root Rot",
        description: "A soil-borne disease caused by overwatering and poor drainage, leading to fungal pathogens (Pythium, Phytophthora) attacking the root system. Infected roots turn brown, mushy, and lose their ability to absorb water and nutrients, often killing the plant."
    },
    {
        name: "Fusarium Wilt",
        description: "A destructive soil-borne fungal disease (Fusarium oxysporum) that blocks the vascular system of plants. Symptoms include progressive wilting, yellowing of lower leaves, and brown discoloration inside stems. It can persist in soil for years."
    },
    {
        name: "Bacterial Wilt",
        description: "Caused by Ralstonia solanacearum, this bacterial disease leads to sudden, irreversible wilting of the entire plant without prior yellowing. It primarily affects tomatoes, peppers, potatoes, and eggplants in warm tropical climates."
    },
    {
        name: "Anthracnose",
        description: "A group of fungal diseases causing dark, sunken lesions on leaves, stems, flowers, and fruits. Common in warm, humid conditions, anthracnose can destroy entire harvests of beans, cucumbers, tomatoes, and mangoes if left untreated."
    },
    {
        name: "Rust",
        description: "A fungal disease recognized by orange, yellow, or reddish-brown pustules on the undersides of leaves. Rust fungi are highly host-specific and can cause severe defoliation, reducing crop yield and plant vitality significantly."
    },
    {
        name: "Early Blight",
        description: "Caused by Alternaria solani, early blight produces dark brown spots with concentric rings (target-like pattern) on older leaves first. It commonly affects tomatoes and potatoes, especially in warm weather with alternating wet and dry periods."
    },
    {
        name: "Late Blight",
        description: "A devastating oomycete disease (Phytophthora infestans) responsible for the Irish Potato Famine. It causes water-soaked gray-green lesions that rapidly enlarge and turn brown-black, destroying foliage and tubers within days."
    },
    {
        name: "Mosaic Virus",
        description: "A viral disease creating a distinctive mottled pattern of light and dark green on leaves. Spread by aphids and contaminated tools, it stunts growth, reduces yield, and cannot be cured — only prevented through resistant varieties and vector control."
    },
    {
        name: "Black Spot",
        description: "A common fungal disease of roses (Diplocarpon rosae) causing circular black spots with fringed margins on leaves. Severely infected leaves turn yellow and drop, weakening the plant and reducing bloom production throughout the season."
    },
    {
        name: "Sooty Mold",
        description: "A black, soot-like fungal coating that grows on the honeydew secreted by sap-sucking insects like aphids, whiteflies, and scale. While it doesn't directly infect the plant, it blocks sunlight and reduces photosynthesis, weakening the plant."
    },
    {
        name: "Damping Off",
        description: "A disease complex caused by soil-borne fungi (Pythium, Rhizoctonia, Fusarium) that attacks seeds and young seedlings. Pre-emergence damping off prevents germination, while post-emergence damping off causes seedlings to collapse at the soil line."
    },
    {
        name: "Leaf Curl",
        description: "Caused by the fungus Taphrina deformans, leaf curl primarily affects peach and nectarine trees. New leaves become thickened, puckered, and distorted with reddish-purple coloration. Severe infections reduce fruit quality and tree vigor."
    }
];
const seedDiseases = async () => {
    try {
        console.log('🌱 Starting diseases seeding...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI is not defined in .env');
            process.exit(1);
        }
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        // Clear existing diseases
        await Disease.deleteMany({});
        console.log('🗑️  Cleared old diseases');
        let added = 0;
        let skipped = 0;
        for (const disease of diseases) {
            const exists = await Disease.findOne({ name: disease.name });
            if (exists) {
                console.log(`   ⏩ Skipped (exists): ${disease.name}`);
                skipped++;
            }
            else {
                await Disease.create(disease);
                console.log(`   ✅ Added: ${disease.name}`);
                added++;
            }
        }
        console.log('\n🎉 Diseases seeding completed!');
        console.log('📊 Summary:');
        console.log(`   ✅ Added:   ${added}`);
        console.log(`   ⏩ Skipped: ${skipped}`);
        console.log(`   🦠 Total in DB: ${await Disease.countDocuments()}`);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding diseases:', error);
        process.exit(1);
    }
};
seedDiseases();
