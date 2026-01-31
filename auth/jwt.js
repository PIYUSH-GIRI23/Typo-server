import jwt from 'jsonwebtoken';
import {env} from '../init/env.js';

const generateTokens = (payload, rememberMe = false) => {
    try {
        if (!payload || !payload.userId) throw new Error('Payload with userId required for token generation');

        const jwtExpiry = rememberMe ? env.jwt.accessTokenLongExpire : env.jwt.accessTokenExpire;

        const jwtToken = jwt.sign(
            { userId: payload.userId, type: 'access' },
            env.jwt.secret,
            {
                expiresIn: jwtExpiry,
                issuer: env.jwt.issuer
            }
        );

        const refreshToken = jwt.sign(
            { userId: payload.userId, type: 'refresh' },
            env.jwt.secret,
            {
                expiresIn: env.jwt.refreshTokenExpire,
                issuer: env.jwt.issuer
            }
        );

        return {
            accessToken: jwtToken,
            refreshToken,
            expiresIn: rememberMe ? '30 days' : '7 days'
        };
    } 
    catch (error) {

        throw new Error('Failed to generate authentication tokens');
    }
};

const verifyToken = async (token) => {
    try {
        if (!token) throw new Error('Token is required for verification');

        const decoded = jwt.verify(token, env.jwt.secret, {
            issuer: env.jwt.issuer
        });

        return {
            valid: true,
            decoded,
            expired: false
        };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return {
                valid: false,
                decoded: null,
                expired: true,
                error: 'Token expired'
            };
        } else if (error.name === 'JsonWebTokenError') {
            return {
                valid: false,
                decoded: null,
                expired: false,
                error: 'Invalid token'
            };
        } else {
            return {
                valid: false,
                decoded: null,
                expired: false,
                error: error.message
            };
        }
    }
};


const renewJWT = async (refreshToken, rememberMe = false) => {
    try {
        if (!refreshToken) throw new Error('Refresh token is required');

        const decoded = jwt.decode(refreshToken);
        if (!decoded || !decoded.userId) throw new Error('Invalid refresh token format');

        const verification = await verifyToken(refreshToken);
        if (!verification.valid) throw new Error(verification.error || 'Invalid or expired refresh token');

        if (verification.decoded.type !== 'refresh') throw new Error('Invalid token type - refresh token required');
        
        const payload = { userId: verification.decoded.userId };
        return generateTokens(payload, rememberMe);
    }
     catch (error) {
        throw new Error(`Failed to renew JWT token: ${error.message}`);
    }
};

const jwt = {
    generateTokens,
    verifyToken,
    renewJWT
};
export default jwt;