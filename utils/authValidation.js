import { z } from "zod";
import regex from "./regexValidation.js";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(regex.USERNAME_REGEX, "Invalid username format");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(regex.EMAIL_REGEX, "Invalid email format");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(50, "Password must be at most 50 characters")
  .regex(regex.PASSWORD_REGEX, "Password does not meet complexity rules");

const identifierSchema = z
  .string()
  .trim()
  .min(3, "Identifier is required")
  .refine(
    (value) => regex.EMAIL_REGEX.test(value) || regex.USERNAME_REGEX.test(value),
    "Identifier must be a valid email or username"
  );

const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm password is required"),
  firstName: z.string().trim().min(2, "First name is required").max(30),
  lastName: z.string().trim().min(2, "Last name is required").max(30),
  username: usernameSchema,
  rememberMe: z.boolean().optional(),
});

const formatZodError = (error) =>
  error.issues.map((issue) => issue.message).join(", ");

const validateLoginInput = (payload) => {
  const result = loginSchema.safeParse(payload);
  if (!result.success) {
    return { success: false, message: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
};

const validateRegisterInput = (payload) => {
  const result = registerSchema.safeParse(payload);
  if (!result.success) {
    return { success: false, message: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
};

const validateUsername = (username) => {
  const result = usernameSchema.safeParse(username);
  if (!result.success) {
    return { success: false, message: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
};

const validateDeleteAccountInput = (payload) => {
  const schema = z.object({
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  });
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { success: false, message: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
};

export { 
  validateLoginInput, 
  validateRegisterInput, 
  validateUsername, 
  validateDeleteAccountInput 
};
