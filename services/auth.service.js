import User from "../models/user.model.js";
import regex from "../utils/regexValidation.js";

const findUserByEmailOrUsername = async (identifier) => {
	if (!identifier || typeof identifier !== "string") return null;
	const trimmed = identifier.trim();
	const isEmail = regex.EMAIL_REGEX.test(trimmed);
	const lookup = isEmail ? trimmed.toLowerCase() : trimmed;
	return User.findOne({
		$or: [{ email: lookup }, { username: lookup }],
	});
};

const createUser = async (payload) => {
	return User.create(payload);
};

const updateLastLogin = async (userId) => {
	if (!userId) return null;
	return User.findByIdAndUpdate(
		userId,
		{ lastLogin: Date.now() },
		{ new: true }
	);
};

const authService = {
	findUserByEmailOrUsername,
	createUser,
	updateLastLogin,
};

export default authService;
