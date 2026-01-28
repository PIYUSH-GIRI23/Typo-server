import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    wpm: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    accuracy: { 
        type: Number, 
        default: 0, 
        min: 0, 
        max: 100 
    },
    testTimings: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    lastTestTaken: { 
        type: Number, // Unix timestamp in milliseconds
        default: null 
    },     
    totalPar: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    maxStreak: { 
        type: Number, 
        default: 0, 
        min: 0 
    }
  },
  {
    timestamps: false
  }
);

analyticsSchema.index({ userId: 1 }, { unique: true });

export default analyticsSchema;
