import AppError from "../error/AppError.js";
import analyticsService from "../services/analytics.service.js";
import errorHandler from "../error/errorHandler.js";
import formatDateTime from "../utils/formatDateTIme.js";

const getUserAnalytics = async(req, res, next) => {
    try {
        const { userId } = req.params;
        const analytics = await analyticsService.getAnalytics(userId);
        
        if (!analytics) {
            return next(new AppError("Analytics not found", 404));
        }
        
        const userData = {
            ...analytics.userData.toObject(),
            lastLogin: analytics.userData.lastLogin 
                ? formatDateTime(analytics.userData.lastLogin) 
                : null
        };
        delete userData._id;
        
        const analyticsData = {
            wpm: analytics.wpm,
            accuracy: analytics.accuracy,
            testTimings: analytics.testTimings,
            lastTestTaken: analytics.lastTestTaken 
                ? formatDateTime(analytics.lastTestTaken) 
                : null,
            totalPar: analytics.totalPar,
            maxStreak: analytics.maxStreak
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
        const { userId } = req.params;
        const { wpm, accuracy, testTimings, maxStreak, lastTestTaken } = req.body;
        
        // Validate required fields
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
    const { userId } = req.params;

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
        const {username} = req.params;
        const analytics = await analyticsService.getAccountAnalytics(username);

        if(!analytics){
            return next (new AppError("Analytics not found", 404));
        }
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