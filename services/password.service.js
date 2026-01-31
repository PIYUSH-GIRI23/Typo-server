import User from "../models/user.model.js";

const findUserByEmail = async (email) => {
	if (!email) return null;
	return User.findOne({ email: email.trim().toLowerCase() });
};

const resetUserPassword = async (email, hashedPassword) => {
	if (!email || !hashedPassword) return null;
	return User.findOneAndUpdate(
		{ email: email.trim().toLowerCase() },
		{ password: hashedPassword },
		{ new: true, runValidators: true }
	).select("firstName lastName username email");
};

const passwordService = {
	findUserByEmail,
	resetUserPassword,
};

export default passwordService;
