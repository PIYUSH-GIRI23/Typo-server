import AppError from "../error/AppError.js";
import analyticsService from "../services/analytics.service.js";
import errorHandler from "../error/errorHandler.js";

const getUserAnalytics = async(req, res, next) => {
    try {
        const { userId } = req.params;
        const analytics = await analyticsService.getAnalytics(userId);
        
        if (!analytics) {
            return next(new AppError("Analytics not found", 404));
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


const analyticsController = {
    getUserAnalytics,
    updateAnalytics,
    resetAnalytics
};

export default analyticsController;