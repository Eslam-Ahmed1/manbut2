import express from 'express';
import { authenticationController } from '../controllers/index.js';
import Authorization from '../middlewares/authMiddleware.js';
import { changePasswordSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/authentication.js';
import validate from '../middlewares/validationRequestMiddleware.js';
import { sendvalidationEmail, verifiyEmail } from '../middlewares/validateEmail.js';
let route = express.Router();
// registration route with email validation middleware
route.post('/register', validate({ bodySchema: registerSchema }), authenticationController.register, sendvalidationEmail);
// email verification route
route.post('/verify-email', verifiyEmail);
// resend email verification route
route.post('/resend-verification-email', sendvalidationEmail);
route.post('/login', validate({ bodySchema: loginSchema }), authenticationController.login);
//middleware for check valid token 
route.get('/user', Authorization, authenticationController.user);
route.put('/change-password', Authorization, validate({ bodySchema: changePasswordSchema }), authenticationController.changePassword);
route.post('/forgot-password', validate({ bodySchema: forgotPasswordSchema }), authenticationController.forgotPassword);
route.post('/reset-password', validate({ bodySchema: resetPasswordSchema }), authenticationController.resetPassword);
export default route;
