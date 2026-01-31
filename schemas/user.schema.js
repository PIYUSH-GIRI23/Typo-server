import mongoose from "mongoose";
import regex from "../utils/regexValidation.js";

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
        validator: (value) => regex.USERNAME_REGEX.test(value),
        message: (props) => `${props.value} is not a valid username!`
      }
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => regex.EMAIL_REGEX.test(value),
        message: (props) => `${props.value} is not a valid email!`
      }
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 50,
      validate: {
        validator: (value) => regex.PASSWORD_REGEX.test(value),
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


export default userSchema;
