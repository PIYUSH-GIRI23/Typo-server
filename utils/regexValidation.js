const USERNAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const regex={
    USERNAME_REGEX,
    EMAIL_REGEX,
    PASSWORD_REGEX
};

export default regex;