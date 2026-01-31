import AppError from "../error/AppError.js";
import errorHandler from "../error/errorHandler.js";
import passwordService from "../services/password.service.js";
import { validateEmail, validateResetPasswordInput } from "../utils/authValidation.js";
import { generateOtp } from "../utils/otpUtil.js";
import otpStore from "../redis/otp.js";
import passwordHash from "../utils/passwordHash.js";
import { pushMailQueue } from "../queue/mailQueue.js";
import formatDateTime from "../utils/formatDateTIme.js";

const sendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        const validation = validateEmail(email);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const normalizedEmail = validation.data;
        const user = await passwordService.findUserByEmail(normalizedEmail);
        if (!user) {
            return next(new AppError("Email not found", 404));
        }

        const otp = generateOtp();
        await otpStore.setOtp(normalizedEmail, otp);

        await pushMailQueue(normalizedEmail, "reset-otp", formatDateTime(Date.now()), 10);

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};
const resetPassword = async (req, res, next) => {
    try {
        const validation = validateResetPasswordInput(req.body);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const { email, otp, password, confirmPassword } = validation.data;

        if (password !== confirmPassword) {
            return next(new AppError("Passwords do not match", 400));
        }

        const stored = await otpStore.getOtp(email);
        if (!stored) {
            return next(new AppError("OTP expired or invalid", 400));
        }

        if (stored.attempts >= otpStore.MAX_ATTEMPTS) {
            await otpStore.deleteOtp(email);
            return next(new AppError("Maximum OTP attempts exceeded", 429));
        }

        if (stored.otp !== otp) {
            await otpStore.incrementOtpAttempts(email);
            return next(new AppError("Invalid OTP", 400));
        }

        const hashedPassword = await passwordHash.encryptPassword(password);
        const user = await passwordService.resetUserPassword(email, hashedPassword);

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        await otpStore.deleteOtp(email);

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};

const passwordController = {
    resetPassword,
    sendOTP
};

export default passwordController;