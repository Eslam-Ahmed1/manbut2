import mongoose from 'mongoose';
let connectDB = async function () {
    try {
        await mongoose.connect("mongodb://localhost:27017/Manbut_Al");
        console.log('database connected');
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
export default connectDB;
