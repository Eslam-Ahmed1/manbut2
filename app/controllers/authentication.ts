import { request, type Response, type Request, type NextFunction } from 'express';
import { authenticationService } from '../services/index.js'
import validate from '../middlewares/validationRequestMiddleware.js';
import { changePasswordSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/authentication.js';
import z, { json } from 'zod'
import { fromError, isZodErrorLike } from 'zod-validation-error'
import { appError } from '../../utils/appErrors.js';
const registermiddleware = validate({ bodySchema: registerSchema })
const loginmiddleware = validate({ bodySchema: loginSchema })
const register: typeof registermiddleware = async (req, res, next) => {
    try {
        const userDTO = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        }
        await authenticationService.register(userDTO);
        
        // Signal to the validateEmail middleware that this is a registration
        res.locals.isRegister = true;
        next();
    }
    catch (err) {
        next(err)
    }
}
const login: typeof loginmiddleware = async (req, res, next) => {
    try {
        const loginDTO = { email: req.body.email, password: req.body.password }
        const token = await authenticationService.login(loginDTO);
        return res.status(200).json({ token })
    }
    catch (err) {
        next(err)
    }
}
const user = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //i need get this user from database by using unique email
        let user = req.user;
        res.json(user);
    }
    catch (err) {
        //this error may come from database
        next(err)
    }
}
const changePasswordMiddleware = validate({ bodySchema: changePasswordSchema })
const changePassword: typeof changePasswordMiddleware = async (req, res, next) => {
    try {
        const result = await authenticationService.changePassword({
            userId: req.user._id,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword,
        });
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

const forgotPasswordMiddleware = validate({ bodySchema: forgotPasswordSchema })
const forgotPassword: typeof forgotPasswordMiddleware = async (req, res, next) => {
    try {
        const result = await authenticationService.forgotPassword(req.body.email);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

const resetPasswordMiddleware = validate({ bodySchema: resetPasswordSchema })
const resetPassword: typeof resetPasswordMiddleware = async (req, res, next) => {
    try {
        const result = await authenticationService.resetPassword({
            token: req.body.token,
            newPassword: req.body.newPassword,
        });
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

export { register, login, user, changePassword, forgotPassword, resetPassword }