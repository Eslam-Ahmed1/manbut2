import { sendEmailValidation } from '../services/email.js';
import User from '../models/user.js';
import { appError } from '../../utils/appErrors.js';
import JWT from 'jsonwebtoken';
export const sendvalidationEmail = async (req, res, next) => {
    try {
        const to = req.body.email || req.user?.email;
        if (!to) {
            return next(new appError('Email is required', 400));
        }
        const user = await User.findOne({ email: to });
        if (!user) {
            return next(new appError('User not found', 404));
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        user.set('emailVerificationToken', token);
        user.set('emailVerificationExpires', new Date(Date.now() + 3600000)); // 1 hour expiration
        await user.save();
        await sendEmailValidation(to, token);
        // If this is the initial registration flow, send a 201 response.
        if (res.locals.isRegister) {
            return res.status(201).json({
                message: 'User registered successfully. Please check your email to verify your account.'
            });
        }
        res.status(200).json({ message: 'Validation email sent successfully' });
    }
    catch (error) {
        next(error);
    }
};
export const verifiyEmail = async (req, res, next) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return next(new appError('Email and token are required', 400));
        }
        const user = await User.findOne({
            email,
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });
        if (!user) {
            return next(new appError('Invalid or expired verification token', 400));
        }
        user.set('isEmailVerified', true);
        user.set('emailVerificationToken', undefined);
        user.set('emailVerificationExpires', undefined);
        await user.save();
        // Generate the JWT token now that the user is verified
        if (!process.env.SECRET_TOKEN) {
            throw new appError('Server configuration error: Missing secret token', 500);
        }
        const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        const jwtToken = JWT.sign(payload, process.env.SECRET_TOKEN, { expiresIn: '5d' });
        res.status(200).json({
            message: 'Email verified successfully',
            token: jwtToken
        });
    }
    catch (error) {
        next(error);
    }
};
