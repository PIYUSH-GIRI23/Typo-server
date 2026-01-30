import mongoose from "mongoose";
import userSchema from "../schemas/user.schema.js";

const User = mongoose.model("User", userSchema, "users");

export default User;
