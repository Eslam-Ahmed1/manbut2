import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import { appError } from "../../utils/appErrors.js";
import { MongoServerError } from 'mongodb';
//this function return appError 
function detectError(err) {
    // multer errors (file upload)
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE')
            return new appError('File too large. Maximum allowed size is 10 MB.', 400);
        return new appError(`Upload error: ${err.message}`, 400);
    }
    // multer fileFilter rejection (thrown as generic Error)
    if (err.message && err.message.includes('Unsupported file type'))
        return new appError(err.message, 400);
    // zod errors
    if (err instanceof ZodError)
        return new appError(fromError(err).message, 400);
    //jsonWebToken errors 
    if (err instanceof jwt.JsonWebTokenError)
        return new appError('invalid token, please log in again', 401);
    if (err instanceof jwt.TokenExpiredError)
        return new appError('session expired, please log in again', 401);
    if (err instanceof jwt.NotBeforeError)
        return new appError('this token used before activate', 401);
    //mongoose errors 
    if (err instanceof mongoose.Error.ValidationError)
        return new appError(`${Object.values(err.errors).map(element => {
            return `${element.path} : ${element.message} `;
        })}`, 400);
    if (err instanceof mongoose.Error.CastError)
        return new appError(`invalid type ${err.path} whrere value is ${err.value}`, 400);
    //dublicate key
    if (err instanceof MongoServerError && err.code == 11000)
        return new appError(`${Object.keys(err.keyPattern)} ${Object.values(err.keyValue)} already exist , use differnet one`, 400);
    // not predict error or appError 
    return err;
}
export { detectError };
