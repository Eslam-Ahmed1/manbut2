import mongoose from "mongoose"
let userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    created_at: { type: Date, default: Date.now },
    address: { type: String },
    phone: {
        type: String,
        match: [/^01[0125][0-9]{8}$/, 'Please enter a valid Egyptian phone number']
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    image_url: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date }
})
let User = mongoose.model('user', userSchema);
// Add this temporarily to drop indexes that aren't in your schema anymore
User.syncIndexes();
export default User;