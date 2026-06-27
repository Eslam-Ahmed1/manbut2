import mongoose from 'mongoose';
let connectDB = async function () {
    try {
        // Increase the timeout to 30 seconds to allow for slow connections or slow container startups
        mongoose.set('bufferTimeoutMS', 30000);
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
        });
        console.log('database connected');
    }
    catch (err) {
        console.error('Failed to connect to MongoDB. If using MongoDB Atlas, ensure your IP is whitelisted. If using Docker, ensure the db container is healthy.');
        console.error(err);
        process.exit(1);
    }
};
export default connectDB;
