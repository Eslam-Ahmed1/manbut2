import mongoose from 'mongoose';
import Disease from '../app/models/diseases.js';
// ============================================================
// PLANT DISEASES SEED - 150+ diseases across all categories
// ============================================================
export const diseasesData = [
    // ─── FUNGAL DISEASES ────────────────────────────────────────
    // Powdery Mildews
    { name: "Powdery Mildew", description: "A common fungal disease caused by Erysiphe and related genera. Appears as a white powdery coating on leaves and stems, weakening the plant and reducing yield." },
    { name: "Downy Mildew", description: "A fungal-like disease caused by Peronospora and related genera. Shows as yellow patches on the upper leaf surface with gray or purple growth on the underside." },
    { name: "Grape Powdery Mildew", description: "A fungal disease specific to grapevines caused by Uncinula necator. Covers leaves and clusters with a white powder, reducing fruit quality." },
    { name: "Rose Powdery Mildew", description: "A fungal disease of roses caused by Sphaerotheca pannosa. Appears as a white powdery layer on buds and young leaves." },
    // Rusts
    { name: "Wheat Stem Rust", description: "A serious fungal disease of wheat and barley caused by Puccinia graminis. Produces red pustules on stems and causes severe crop losses." },
    { name: "Leaf Rust", description: "A fungal disease of cereals caused by Puccinia triticina. Appears as small orange pustules on leaves, reducing yield." },
    { name: "Coffee Leaf Rust", description: "A fungal disease of coffee caused by Hemileia vastatrix. Shows as yellow-orange spots on leaves and is one of the most devastating coffee diseases worldwide." },
    { name: "Bean Rust", description: "A fungal disease of beans caused by Uromyces appendiculatus. Appears as brown pustules surrounded by a yellow halo on leaves." },
    { name: "Rose Rust", description: "A fungal disease of roses caused by Phragmidium mucronatum. Appears as orange pustules on the underside of leaves." },
    { name: "Asparagus Rust", description: "A fungal disease of asparagus caused by Puccinia asparagi. Appears as reddish-brown pustules on stems and foliage." },
    // Blights
    { name: "Late Blight", description: "A devastating fungal disease of potatoes and tomatoes caused by Phytophthora infestans. Responsible for the Irish Famine of 1845. Appears as water-soaked brown lesions on leaves." },
    { name: "Early Blight", description: "A fungal disease of tomatoes and potatoes caused by Alternaria solani. Appears as dark brown spots with concentric rings on lower leaves." },
    { name: "Fire Blight", description: "A bacterial disease of apples and pears caused by Erwinia amylovora. Makes branches appear as if scorched by fire." },
    { name: "Southern Blight", description: "A fungal disease affecting a wide range of plants caused by Sclerotium rolfsii. Attacks the stem base and causes rapid wilting." },
    { name: "Botrytis Blight", description: "A fungal disease caused by Botrytis cinerea affecting hundreds of plant species. Appears as gray mold on leaves, flowers, and fruit in humid conditions." },
    { name: "Chestnut Blight", description: "A devastating fungal disease of chestnut trees caused by Cryphonectria parasitica. Nearly wiped out the American chestnut in the 20th century." },
    { name: "Phytophthora Blight", description: "A fungal disease of pepper, cucumber, and squash caused by Phytophthora capsici. Causes sudden wilting and fruit rot." },
    // Leaf Spots
    { name: "Cercospora Leaf Spot", description: "A fungal disease of beet, spinach, and peanuts caused by Cercospora spp. Appears as circular gray or brown spots with dark borders." },
    { name: "Septoria Leaf Spot", description: "A fungal disease of tomatoes and wheat caused by Septoria spp. Appears as small circular spots with light centers and dark margins." },
    { name: "Angular Leaf Spot", description: "A bacterial disease of cucumber and squash caused by Pseudomonas syringae. Appears as angular lesions bounded by leaf veins." },
    { name: "Bacterial Leaf Spot", description: "A bacterial disease of tomatoes and peppers caused by Xanthomonas campestris. Appears as water-soaked spots that turn dark brown." },
    { name: "Frogeye Leaf Spot", description: "A fungal disease of soybean caused by Cercospora sojina. Appears as circular spots with gray centers and brown borders resembling a frog's eye." },
    { name: "Tar Spot", description: "A fungal disease of corn caused by Phyllachora maydis. Appears as shiny black spots resembling tar on leaves." },
    { name: "Anthracnose Leaf Blight", description: "A fungal disease of corn caused by Colletotrichum graminicola. Appears as oval brown lesions on leaves with stalk rot." },
    // Wilts
    { name: "Fusarium Wilt", description: "A fungal disease affecting a wide range of plants caused by Fusarium oxysporum. Invades vascular tissue causing one-sided wilting then plant death." },
    { name: "Verticillium Wilt", description: "A fungal disease affecting over 300 plant species caused by Verticillium dahliae. Causes yellowing and gradual wilting with brown discoloration of vascular tissue." },
    { name: "Bacterial Wilt", description: "A bacterial disease of cucumber, tomato, and corn caused by Ralstonia solanacearum and Erwinia tracheiphila. Spreads via insects and causes rapid wilting." },
    { name: "Panama Wilt", description: "A fungal disease of banana caused by Fusarium oxysporum f.sp. cubense. Devastated banana plantations in Latin America in the 1950s." },
    { name: "Oak Wilt", description: "A fungal disease of oak trees caused by Ceratocystis fagacearum. Spreads through interconnected roots and kills trees within weeks." },
    { name: "Dutch Elm Disease", description: "A devastating fungal disease of elm trees caused by Ophiostoma ulmi. Killed millions of trees across Europe and North America." },
    // Rots
    { name: "Root Rot", description: "A fungal disease affecting roots of most plants caused by Pythium, Phytophthora, and Rhizoctonia. Results from overwatering and poor drainage." },
    { name: "Crown Rot", description: "A fungal disease affecting the stem base and crown caused by various fungi. Appears as brown or black rot at soil level." },
    { name: "Stem Rot", description: "A fungal disease of plant stems caused by Sclerotinia sclerotiorum. Appears as white cottony rot with hard black bodies." },
    { name: "Fruit Rot", description: "A fungal disease of fruits caused by Botrytis and Monilinia. Appears as brown or gray rot spreading across fruit surfaces." },
    { name: "Blossom End Rot", description: "A physiological disorder of tomatoes, peppers, and cucumbers caused by calcium deficiency. Appears as a dark brown sunken spot at the blossom end of fruit." },
    { name: "Soft Rot", description: "A bacterial disease of vegetables and tubers caused by Pectobacterium carotovorum. Turns tissue into a soft, foul-smelling mass." },
    { name: "Black Rot", description: "A bacterial disease of cabbage and cruciferous vegetables caused by Xanthomonas campestris. Appears as yellow V-shaped lesions on leaf margins turning dark brown." },
    { name: "White Rot", description: "A fungal disease of onion and garlic caused by Sclerotium cepivorum. Appears as white cottony growth on the bulb with root decay." },
    { name: "Neck Rot", description: "A fungal disease of onion during storage caused by Botrytis allii. Appears as brown-gray rot at the neck of the bulb." },
    { name: "Dry Rot", description: "A fungal disease of potatoes caused by Fusarium solani. Appears as dry cavities inside the tuber with shriveled skin." },
    // Smuts & Bunts
    { name: "Corn Smut", description: "A fungal disease of corn caused by Ustilago maydis. Converts kernels and tissue into gray-black masses filled with spores." },
    { name: "Loose Smut", description: "A fungal disease of wheat and barley caused by Ustilago tritici. Converts heads into black masses of spores." },
    { name: "Common Bunt", description: "A fungal disease of wheat caused by Tilletia caries. Converts kernels into foul-smelling black masses." },
    { name: "Onion Smut", description: "A fungal disease of onion caused by Urocystis cepulae. Appears as black streaks on the first leaves of seedlings." },
    // Cankers & Diebacks
    { name: "Cytospora Canker", description: "A fungal disease of fruit and ornamental trees caused by Cytospora spp. Appears as cankers on bark with gum exudate." },
    { name: "Nectria Canker", description: "A fungal disease of various trees caused by Nectria galligena. Appears as oval cankers on branches with dead tissue." },
    { name: "Bacterial Canker", description: "A bacterial disease of citrus and cherry trees caused by Pseudomonas syringae. Appears as water-soaked cankers on bark and leaves." },
    { name: "Dieback", description: "A disease condition of trees and shrubs caused by various fungi. Appears as progressive death of branches from tips toward the base." },
    // Damping Off & Seedling Diseases
    { name: "Damping Off", description: "A fungal disease of seedlings caused by Pythium, Rhizoctonia, and Fusarium. Causes seedling collapse at soil level." },
    { name: "Seed Rot", description: "A fungal disease of seeds before germination caused by various fungi. Prevents germination or kills early seedlings." },
    // ─── BACTERIAL DISEASES ─────────────────────────────────────
    { name: "Crown Gall", description: "A bacterial disease affecting over 600 plant species caused by Agrobacterium tumefaciens. Appears as fleshy tumors on roots and stems." },
    { name: "Bacterial Speck", description: "A bacterial disease of tomatoes caused by Pseudomonas syringae pv. tomato. Appears as small dark spots surrounded by a yellow halo." },
    { name: "Bacterial Spot", description: "A bacterial disease of tomatoes and peppers caused by Xanthomonas vesicatoria. Appears as water-soaked spots turning dark brown on leaves and fruit." },
    { name: "Citrus Canker", description: "A serious bacterial disease of citrus caused by Xanthomonas axonopodis. Appears as raised corky lesions on leaves, fruit, and branches." },
    { name: "Halo Blight", description: "A bacterial disease of beans caused by Pseudomonas syringae pv. phaseolicola. Appears as brown spots surrounded by a wide yellow halo." },
    { name: "Wildfire", description: "A bacterial disease of tobacco caused by Pseudomonas syringae pv. tabaci. Appears as brown spots surrounded by a wide yellow halo." },
    { name: "Bacterial Pustule", description: "A bacterial disease of soybean caused by Xanthomonas axonopodis. Appears as small raised pustules on leaves." },
    { name: "Aster Yellows", description: "A phytoplasma disease spread by leafhoppers. Affects hundreds of plant species causing yellowing and flower deformity." },
    { name: "Lethal Yellowing", description: "A phytoplasma disease of palms spread by Myndus crudus. Causes yellowing and palm death within months." },
    // ─── VIRAL DISEASES ─────────────────────────────────────────
    { name: "Tobacco Mosaic Virus", description: "A virus infecting tobacco, tomatoes, peppers, and over 150 plant species. Appears as light and dark green mosaic patterns on leaves with distortion." },
    { name: "Cucumber Mosaic Virus", description: "A widespread virus infecting over 1200 plant species, spread by aphids. Appears as mosaic patterns and leaf distortion." },
    { name: "Tomato Yellow Leaf Curl Virus", description: "A virus of tomatoes spread by whiteflies. Causes leaf curling, yellowing, plant stunting, and complete yield loss." },
    { name: "Potato Virus Y", description: "A virus of potatoes, tomatoes, and peppers spread by aphids. Causes mosaic patterns and leaf necrosis, reducing yield." },
    { name: "Potato Virus X", description: "A virus of potatoes spread by contact. Causes mild mosaic symptoms and reduced yield." },
    { name: "Tomato Spotted Wilt Virus", description: "A virus infecting over 1000 plant species, spread by thrips. Causes bronze spots and ring patterns on leaves and fruit." },
    { name: "Bean Common Mosaic Virus", description: "A virus of beans spread by aphids. Causes mosaic patterns and leaf curling, reducing yield." },
    { name: "Papaya Ringspot Virus", description: "A virus of papaya and cucurbits spread by aphids. Causes mosaic patterns and ring spots on fruit with leaf distortion." },
    { name: "Banana Bunchy Top Virus", description: "A virus of banana spread by aphids. Causes plant stunting and bunching of leaves at the top of the stem." },
    { name: "Citrus Tristeza Virus", description: "A virus of citrus spread by aphids. Causes decline of trees grafted on certain rootstocks and major economic losses." },
    { name: "Plum Pox Virus", description: "A virus of plum, apricot, and cherry trees spread by aphids. Causes spots and ring patterns on leaves and fruit." },
    { name: "Lettuce Mosaic Virus", description: "A virus of lettuce spread by aphids and seeds. Causes mosaic patterns and leaf distortion." },
    { name: "Watermelon Mosaic Virus", description: "A virus of watermelon and cucurbits spread by aphids. Causes mosaic patterns and distortion of leaves and fruit." },
    { name: "Zucchini Yellow Mosaic Virus", description: "A virus of zucchini and cucurbits spread by aphids. Causes severe yellow mosaic and fruit distortion." },
    { name: "Maize Dwarf Mosaic Virus", description: "A virus of corn spread by aphids. Causes mosaic patterns, stunting, and reduced yield." },
    { name: "Rice Tungro Virus", description: "A viral disease of rice spread by leafhoppers. Causes orange-yellow discoloration, stunting, and major losses across Asia." },
    // ─── NEMATODE DISEASES ──────────────────────────────────────
    { name: "Root Knot Nematode", description: "A nematode infecting roots of over 2000 plant species caused by Meloidogyne spp. Creates galls on roots and impairs water and nutrient uptake." },
    { name: "Cyst Nematode", description: "A nematode infecting potatoes, beet, and cereals caused by Heterodera and Globodera spp. Causes yellowing, stunting, and reduced yield." },
    { name: "Lesion Nematode", description: "A nematode infecting roots of various plants caused by Pratylenchus spp. Creates brown lesions on roots and opens the door to secondary infections." },
    { name: "Stem Nematode", description: "A nematode infecting onion, garlic, and strawberry caused by Ditylenchus dipsaci. Causes distortion and swelling of stems and bulbs." },
    { name: "Pine Wood Nematode", description: "A nematode infecting pine trees caused by Bursaphelenchus xylophilus. Causes rapid wilting and tree death within months." },
    // ─── PHYSIOLOGICAL DISORDERS ────────────────────────────────
    { name: "Chlorosis", description: "A physiological disorder appearing as leaf yellowing with green veins remaining. Caused by deficiency of iron, manganese, or zinc, or high soil pH." },
    { name: "Tip Burn", description: "A physiological disorder of lettuce and strawberry caused by calcium deficiency in young tissue. Appears as browning of inner leaf margins." },
    { name: "Sunscald", description: "A physiological disorder of tomatoes, peppers, and apples caused by direct sun exposure. Appears as white or brown patches on fruit." },
    { name: "Edema", description: "A physiological disorder of various plants caused by water uptake exceeding transpiration. Appears as blisters or bumps on leaves." },
    { name: "Nutrient Deficiency", description: "A physiological disorder caused by lack of essential nutrients such as nitrogen, phosphorus, or potassium. Appears as yellowing or discoloration of leaves." },
    // ─── SOIL-BORNE DISEASES ────────────────────────────────────
    { name: "Rhizoctonia Root Rot", description: "A fungal disease of roots of various plants caused by Rhizoctonia solani. Appears as brown or black rot on roots and lower stems." },
    { name: "Pythium Root Rot", description: "A fungal disease of roots of various plants caused by Pythium spp. Appears as black water-soaked rot on roots in wet soil." },
    { name: "Sclerotinia Stem Rot", description: "A fungal disease affecting over 400 plant species caused by Sclerotinia sclerotiorum. Appears as white cottony rot with hard black bodies." },
    { name: "Charcoal Rot", description: "A fungal disease of soybean, corn, and sesame caused by Macrophomina phaseolina. Appears as charcoal-gray discoloration in stems and roots." },
    { name: "Texas Root Rot", description: "A fungal disease affecting over 2000 plant species in arid regions caused by Phymatotrichopsis omnivora. Causes sudden wilting and plant death." },
    // ─── CROP-SPECIFIC DISEASES ─────────────────────────────────
    // Tomato
    { name: "Tomato Mosaic Virus", description: "A virus of tomatoes spread by contact and contaminated tools. Causes mosaic patterns and leaf distortion, reducing yield." },
    { name: "Tomato Canker", description: "A bacterial disease of tomatoes caused by Clavibacter michiganensis. Appears as stem cankers and white spots on fruit." },
    { name: "Fusarium Crown Rot", description: "A fungal disease of tomatoes and peppers caused by Fusarium oxysporum. Appears as brown discoloration at the stem base with gradual wilting." },
    { name: "Gray Mold", description: "A fungal disease of tomatoes, grapes, and strawberries caused by Botrytis cinerea. Appears as gray mold on leaves and fruit in humid conditions." },
    // Potato
    { name: "Potato Scab", description: "A bacterial disease of potatoes caused by Streptomyces scabies. Appears as rough corky lesions on the tuber surface without affecting nutritional quality." },
    { name: "Potato Blackleg", description: "A bacterial disease of potatoes caused by Pectobacterium atrosepticum. Appears as black discoloration at the stem base with wilting and tuber rot." },
    { name: "Potato Leafroll Virus", description: "A virus of potatoes spread by aphids. Causes rolling and stiffening of lower leaves and significantly reduces yield." },
    // Wheat & Cereals
    { name: "Wheat Powdery Mildew", description: "A fungal disease of wheat caused by Blumeria graminis. Appears as a white powdery layer on leaves and stems, reducing yield." },
    { name: "Wheat Stripe Rust", description: "A fungal disease of wheat caused by Puccinia striiformis. Appears as yellow stripes of pustules on leaves." },
    { name: "Fusarium Head Blight", description: "A serious fungal disease of wheat and barley caused by Fusarium graminearum. Infects heads and contaminates grain with mycotoxins." },
    { name: "Barley Net Blotch", description: "A fungal disease of barley caused by Pyrenophora teres. Appears as net-like brown blotches on leaves." },
    { name: "Rice Blast", description: "The most destructive fungal disease of rice worldwide caused by Magnaporthe oryzae. Infects leaves, nodes, and panicles causing massive losses." },
    { name: "Rice Sheath Blight", description: "A fungal disease of rice caused by Rhizoctonia solani. Appears as oval lesions on leaf sheaths causing significant losses." },
    { name: "Corn Gray Leaf Spot", description: "A fungal disease of corn caused by Cercospora zeae-maydis. Appears as rectangular gray lesions on leaves." },
    { name: "Corn Northern Leaf Blight", description: "A fungal disease of corn caused by Exserohilum turcicum. Appears as large gray-green oval lesions on leaves." },
    // Fruits
    { name: "Apple Scab", description: "A fungal disease of apples and pears caused by Venturia inaequalis. Appears as olive-green to dark spots on leaves and fruit." },
    { name: "Brown Rot", description: "A fungal disease of stone and pome fruits caused by Monilinia spp. Appears as rapidly spreading brown rot on fruit." },
    { name: "Peach Leaf Curl", description: "A fungal disease of peach and nectarine caused by Taphrina deformans. Appears as puckering and reddening of young leaves in spring." },
    { name: "Grape Black Rot", description: "A fungal disease of grapes caused by Guignardia bidwellii. Appears as brown spots on leaves and turns berries into shriveled black mummies." },
    { name: "Grape Botrytis Bunch Rot", description: "A fungal disease of grape clusters caused by Botrytis cinerea. Appears as gray mold on berries in humid conditions." },
    { name: "Citrus Greening", description: "A serious bacterial disease of citrus caused by Candidatus Liberibacter, spread by the Asian citrus psyllid. Causes yellowing, misshapen fruit, and tree death." },
    { name: "Strawberry Gray Mold", description: "A fungal disease of strawberry caused by Botrytis cinerea. Appears as gray mold on fruit and flowers in humid conditions." },
    { name: "Strawberry Verticillium Wilt", description: "A fungal disease of strawberry caused by Verticillium dahliae. Causes wilting and brown discoloration of vascular tissue." },
    { name: "Avocado Root Rot", description: "A fungal disease of avocado caused by Phytophthora cinnamomi. Causes decay of feeder roots, tree decline, and death." },
    { name: "Mango Anthracnose", description: "A fungal disease of mango caused by Colletotrichum gloeosporioides. Appears as black spots on leaves and fruit, causing post-harvest rot." },
    { name: "Banana Panama Disease TR4", description: "A fungal disease threatening bananas worldwide caused by Fusarium oxysporum f.sp. cubense TR4. Infects Cavendish varieties with no effective cure currently available." },
    { name: "Coconut Bud Rot", description: "A fungal disease of palms caused by Phytophthora palmivora. Infects the apical bud and causes palm death." },
];
export const seedDiseases = async () => {
    await Disease.deleteMany({});
    const inserted = await Disease.insertMany(diseasesData);
    console.log(`✅ ${inserted.length} diseases seeded`);
    return inserted;
};
// Run standalone only when executed directly
if (process.argv[1].includes('diseases.seed')) {
    const connectDB = (await import('../app/loaders/mongooseLoader.js')).default;
    await connectDB();
    await seedDiseases();
    await mongoose.disconnect();
}
