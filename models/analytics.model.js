import mongoose from "mongoose";
import analyticsSchema from "../schemas/analytics.schema.js";

const Analytics = mongoose.model("Analytics", analyticsSchema, "analytics");

export default Analytics;
