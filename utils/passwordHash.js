import bcrypt from 'bcryptjs';
const encryptPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password encryption failed: ${error.message}`);
  }
};

const decryptPassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

const passwordHash = {
  encryptPassword,
  decryptPassword,
};

export default passwordHash;
