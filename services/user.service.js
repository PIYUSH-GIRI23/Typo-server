import User from "../models/user.model.js";
import Analytics from "../models/analytics.model.js";

const checkUsernameExists = async (username) => {
  if (!username || typeof username !== "string") return false;
  const user = await User.findOne({ username: username.trim() });
  return user !== null;
};

const updateUsername = async (userId, newUsername) => {
  if (!userId || !newUsername) return null;
  const user = await User.findByIdAndUpdate(
    userId,
    { username: newUsername.trim() },
    { new: true, runValidators: true }
  ).select("firstName lastName username email");
  return user;
};

const deleteUserAccount = async (userId) => {
  if (!userId) return null;
  
  try {
    const user = await User.findByIdAndDelete(userId);

    if (user) {
      await Analytics.deleteOne({ userId });
    }
    
    return user;
  } catch (error) {
    throw new Error(`Failed to delete account: ${error.message}`);
  }
};

const findUserById = async (userId) => {
  if (!userId) return null;
  return User.findById(userId).select("password email username");
};
const userService = {
  checkUsernameExists,
  updateUsername,
  deleteUserAccount,
  findUserById
};

export default userService;
