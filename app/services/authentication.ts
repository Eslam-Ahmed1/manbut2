import dotenv from 'dotenv';
dotenv.config();

import User from '../models/user.js'
import JWT from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { appError } from '../../utils/appErrors.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from './email.js';
//recieve Data transfer object for security and intention
interface userDTO {
    name: string,
    email: string,
    password: string
}
interface loginDTO {
    email: string,
    password: string
}
const register = async (userDTO: userDTO) => {
    const { name, email, password } = userDTO;
    let userExist = await User.findOne({ email: email });
    if (userExist) {
        throw new appError('user exist', 400)
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    let newUser = new User({ name: name, email: email, password: hashPassword });
    const savedUser = await newUser.save();
    try {
        await sendWelcomeEmail(savedUser.email, savedUser.name);
    } catch (error) {
        console.error('Failed to send welcome email:', error);
    }
    
    return savedUser;
}
const login = async (loginDTO: loginDTO) => {
    const { email, password } = loginDTO;
    const user = await User.findOne({ email: email });
    const isMatch = user && await bcrypt.compare(password, user.password);
    
    if (user && isMatch) {
        if (!user.isEmailVerified) {
            throw new appError('Please verify your email address before logging in.', 403);
        }

        const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        if (!process.env.SECRET_TOKEN) {
            throw new appError('Server configuration error: Missing secret token', 500);
        }

        const token = JWT.sign(
            payload,
            process.env.SECRET_TOKEN as string,
            { expiresIn: '5d' }
        );
        return token;
    }
    else {
        throw new appError('Email or Password Incorrect', 401)
    }
}
interface changePasswordDTO {
    userId: string;
    currentPassword: string;
    newPassword: string;
}

const changePassword = async (dto: changePasswordDTO) => {
    const user = await User.findById(dto.userId);
    if (!user) {
        throw new appError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
        throw new appError("Current password is incorrect", 401);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(dto.newPassword, salt);
    await user.save();

    return { message: "Password changed successfully" };
};

const forgotPassword = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new appError("User not found", 404);
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();

    user.set('resetPasswordToken', token);
    user.set('resetPasswordExpires', new Date(Date.now() + 3600000));

    await user.save();

    try {
        await sendPasswordResetEmail(user.email, token);
    } catch (error) {
        user.set('resetPasswordToken', undefined);
        user.set('resetPasswordExpires', undefined);
        await user.save();
        console.error('Failed to send password reset email:', error);
        throw new appError("Failed to send password reset email", 500);
    }

    return { message: "Password reset token sent to your email" };
};

interface resetPasswordDTO {
    token: string;
    newPassword: string;
}

const resetPassword = async (dto: resetPasswordDTO) => {
    const user = await User.findOne({
        resetPasswordToken: dto.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new appError("Password reset token is invalid or has expired", 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(dto.newPassword, salt);

    user.set('resetPasswordToken', undefined);
    user.set('resetPasswordExpires', undefined);

    await user.save();

    return { message: "Password has been successfully reset" };
};

export { register, login, changePassword, forgotPassword, resetPassword };