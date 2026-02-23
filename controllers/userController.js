import AppError from "../error/AppError.js";
import errorHandler from "../error/errorHandler.js";
import userService from "../services/user.service.js";
import { validateUsername, validateDeleteAccountInput } from "../utils/authValidation.js";
import { setUsername } from "../redis/user.js";
import passwordHash from "../utils/passwordHash.js";
import authService from "../services/auth.service.js";
import { pushMailQueue } from "../queue/mailQueue.js";
import formatDateTime from "../utils/formatDateTIme.js";

const checkUsernameAvailability = async (req, res, next) => {
    try {
        const { username } = req.query;

        if (!username) {
            return next(new AppError("Username is required", 400));
        }

        const validation = validateUsername(username);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const validatedUsername = validation.data;
        const exists = await userService.checkUsernameExists(validatedUsername);

        if (exists) {
            await setUsername(validatedUsername);
            return res.status(200).json({
                success: true,
                available: false,
                message: "Username is already taken"
            });
        }

        res.status(200).json({
            success: true,
            available: true,
            message: "Username is available"
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};

const changeUsername = async (req, res, next) => {
    try {
        const { newUsername } = req.body;
        const userId = req.userId;

        if (!newUsername) {
            return next(new AppError("New username is required", 400));
        }

        const validation = validateUsername(newUsername);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const validatedUsername = validation.data;

        const exists = await userService.checkUsernameExists(validatedUsername);
        if (exists) {
            await setUsername(validatedUsername);
            return next(new AppError("Username is already taken", 409));
        }

        const user = await userService.updateUsername(userId, validatedUsername);
        
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        await setUsername(validatedUsername);

        res.status(200).json({
            success: true,
            message: "Username updated successfully",
            data: user
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};

const deleteAccount = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;
        const userId = req.userId;

        const validation = validateDeleteAccountInput(req.body);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        if (password !== confirmPassword) {
            return next(new AppError("Passwords do not match", 400));
        }

        const user = await userService.findUserById(userId);
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        const isMatch = await passwordHash.decryptPassword(password, user.password);
        if (!isMatch) {
            return next(new AppError("Invalid password", 401));
        }

        await userService.deleteUserAccount(userId);

        await pushMailQueue(user.email, "delete", formatDateTime(Date.now()), 5);

        res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    }
    catch(err){
        next(errorHandler(err));
    }
};

const userController = {
    checkUsernameAvailability,
    changeUsername,
    deleteAccount
};

export default userController;