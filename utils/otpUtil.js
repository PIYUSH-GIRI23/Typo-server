const generateOtp = () => {
  const value = Math.floor(100000 + Math.random() * 900000);
  return String(value);
};

export { generateOtp };
