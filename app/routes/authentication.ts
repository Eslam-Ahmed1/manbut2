import express, {type RequestHandler } from 'express'
import { authenticationController } from '../controllers/index.js';
import Authorization from '../middlewares/authMiddleware.js'
import { changePasswordSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/authentication.js'
import validate from '../middlewares/validationRequestMiddleware.js';
import { sendvalidationEmail, verifiyEmail } from '../middlewares/validateEmail.js';

let route = express.Router();

// registration route with email validation middleware
route.post(
    '/register', 
    validate({ bodySchema: registerSchema }) as RequestHandler, 
    authenticationController.register as RequestHandler, 
    sendvalidationEmail as RequestHandler
);

// email verification route
route.post('/verify-email', verifiyEmail as RequestHandler);

// resend email verification route
route.post('/resend-verification-email', sendvalidationEmail as RequestHandler);

route.post('/login', validate({ bodySchema: loginSchema }) as RequestHandler, authenticationController.login as RequestHandler)
//middleware for check valid token 
route.get('/user', Authorization as RequestHandler, authenticationController.user as RequestHandler)
route.put(
    '/change-password',
    Authorization as RequestHandler,
    validate({ bodySchema: changePasswordSchema }) as RequestHandler,
    authenticationController.changePassword as RequestHandler,
)
route.post('/forgot-password', validate({ bodySchema: forgotPasswordSchema }) as RequestHandler, authenticationController.forgotPassword as RequestHandler)
route.post('/reset-password', validate({ bodySchema: resetPasswordSchema }) as RequestHandler, authenticationController.resetPassword as RequestHandler)

export default route;