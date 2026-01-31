import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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
    },
    progress: [
      {
        date: {
          type: String, // YYYY-MM-DD
          required: true
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
        count: {
          type: Number,
          default: 1,
          min: 1
        }
      }
    ]
  },
  {
    timestamps: false
  }
);

analyticsSchema.index({ userId: 1 }, { unique: true });

export default analyticsSchema;
