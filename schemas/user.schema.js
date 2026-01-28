import mongoose from "mongoose";
import { USERNAME_REGEX, EMAIL_REGEX, PASSWORD_REGEX } from "../utils/regexValidation.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      validate: {
        validator: (value) => USERNAME_REGEX.test(value),
        message: (props) => `${props.value} is not a valid username!`
      },
      index: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => EMAIL_REGEX.test(value),
        message: (props) => `${props.value} is not a valid email!`
      }
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 50,
      validate: {
        validator: (value) => PASSWORD_REGEX.test(value),
        message: () => `Password does not meet complexity rules!`
      }
    },

    lastLogin: {
      type: Number,      // Unix timestamp in milliseconds
      default: null
    },

    dateOfJoining: {
      type: Number,      // Unix timestamp in milliseconds
      default: () => Date.now()
    }
  },
  {
    // disable default timestamps, since we'll use unix numbers
    timestamps: false
  }
);

// Additional indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

export default userSchema;
