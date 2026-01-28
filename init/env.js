import dotenv from 'dotenv';

const result = dotenv.config();

if(result.error){
    console.warn('Error loading .env file, proceeding with system environment variables');
}
else{
    console.log('.env file loaded successfully');
}

const ENV = process.env.NODE_ENV || 'development';
const isDevelopment = ENV === 'development';

export const env = {
    env: ENV,
    port: parseInt(process.env.PORT) || 8080,

    mongoURI: isDevelopment ? process.env.LOCAL_MONGO_URI : process.env.CLOUD_MONGO_URI,
    
    jwt: {
        secret: process.env.JWT_SECRET
        accessTokenExpire: process.env.ACCESS_TOKEN_EXPIRE || '7d',
        accessTokenLongExpire: process.env.ACCESS_TOKEN_LONG_EXPIRE || '30d',
        refreshTokenExpire: process.env.REFRESH_TOKEN_EXPIRE || '90d',
        issuer: process.env.TOKEN_ISSUER || 'typo'
    },
    
    para: {
        max: parseInt(process.env.MAX_PARA) || 10,
        quote: process.env.QUOTE_KEY || 'qo',
        wordEasyShort: process.env.WORD_KEY_EASY_SHORT || 'wes',
        wordEasyLong: process.env.WORD_KEY_EASY_LONG || 'wel',
        wordHardShort: process.env.WORD_KEY_HARD_SHORT || 'whs',
        wordHardLong: process.env.WORD_KEY_HARD_LONG || 'whl'
    },
    
    redis: {
        host: isDevelopment ? process.env.LOCAL_REDIS_HOST : process.env.CLOUD_REDIS_HOST,
        port: parseInt(isDevelopment ? process.env.LOCAL_REDIS_PORT : process.env.CLOUD_REDIS_PORT) || 6379,
        password: isDevelopment ? process.env.LOCAL_REDIS_PASSWORD : process.env.CLOUD_REDIS_PASSWORD
    },
    
    rabbitmq: {
        host: isDevelopment ? process.env.LOCAL_RABBITMQ_HOST : process.env.CLOUD_RABBITMQ_HOST,
        port: parseInt(isDevelopment ? process.env.LOCAL_RABBITMQ_PORT : process.env.CLOUD_RABBITMQ_PORT) || 5672,
        user: isDevelopment ? process.env.LOCAL_RABBITMQ_USER : process.env.CLOUD_RABBITMQ_USER,
        password: isDevelopment ? process.env.LOCAL_RABBITMQ_PASSWORD : process.env.CLOUD_RABBITMQ_PASSWORD
    }
};