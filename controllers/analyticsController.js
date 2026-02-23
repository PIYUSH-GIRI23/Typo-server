import AppError from "../error/AppError.js";
import analyticsService from "../services/analytics.service.js";
import errorHandler from "../error/errorHandler.js";
import { validateUsername } from "../utils/authValidation.js";
import { setUsername } from "../redis/user.js";
const getUserAnalytics = async(req, res, next) => {
    try {
        const userId = req.userId;
        const analytics = await analyticsService.getAnalytics(userId);
        
        if (!analytics) {
            return next(new AppError("Analytics not found", 404));
        }
        
        const userData = analytics.userId?.toObject?.() ?? analytics.userId;
        if (userData && userData._id) delete userData._id;
        
        const analyticsData = {
            wpm: analytics.wpm,
            accuracy: analytics.accuracy,
            testTimings: analytics.testTimings,
            lastTestTaken: analytics.lastTestTaken,
            totalPar: analytics.totalPar,
            maxStreak: analytics.maxStreak,
            progress: analytics.progress
        };
        
        res.status(200).json({
            success: true,
            data: {
                userData,
                analyticsData
            }
        });
    }
    catch(err){
        next(errorHandler(err));
    }
}

const updateAnalytics = async(req, res, next) => {
    try {
        const userId  = req.userId;
        const { wpm, accuracy, testTimings, maxStreak, lastTestTaken } = req.body;
        
        if (!wpm || !accuracy || testTimings === undefined || !maxStreak || !lastTestTaken) {
            return next(new AppError("Missing required fields: wpm, accuracy, testTimings, maxStreak, lastTestTaken", 400));
        }

        const analytics = await analyticsService.updateAnalytics(userId, {
            wpm,
            accuracy,
            testTimings,
            maxStreak,
            lastTestTaken
        });
        
        if (!analytics) {
            return next(new AppError("Analytics not found", 404));
        }
        
        res.status(200).json({
            success: true,
            message: "Analytics updated successfully",
            data: analytics
        });
    }
    catch(err){
        next(errorHandler(err));
    }
}

const resetAnalytics = async (req, res, next) => {
  try {
    const userId  = req.userId;
    const analytics = await analyticsService.resetAnalytics(userId);

    if (!analytics) {
      return next(new AppError("Analytics not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Analytics reset successfully",
      data: analytics
    });
  } catch (err) {
    next(errorHandler(err));
  }
};

const getAccountAnalytics = async (req, res, next) => {
    try{
        const { username } = req.query;
        
        const validation = validateUsername(username);
        if (!validation.success) {
            return next(new AppError(validation.message, 400));
        }

        const analytics = await analyticsService.getAccountAnalytics(validation.data);

        if(!analytics){
            return next (new AppError("Analytics not found", 404));
        }

        await setUsername(username);
        res.status(200).json({
            success: true,
            data: analytics
        });
    }
    catch(err){
        next(errorHandler(err));
    }
}
const analyticsController = {
    getUserAnalytics,
    updateAnalytics,
    resetAnalytics,
    getAccountAnalytics
};

export default analyticsController;