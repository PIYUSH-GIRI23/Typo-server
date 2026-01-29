import jwt from './jwt.js';

export const middleware = async(req,res,next)=>{
    try{
        const token = JSON.parse(req.headers['token']);

        if(!token){
            return res.status(401).json({ message: 'Unauthorized - No token provided' });
        }
        let verification = await jwt.verifyToken(token.access_token);

        if (!verification.valid && verification.expired) {
            try {
                const newTokens = await jwt.renewJWT(token.refresh_token);
                res.set('New-Access-Token', newTokens.accessToken);
                res.set('New-Refresh-Token', newTokens.refreshToken);
            }
            catch (error) {
                return res.status(401).json({
                    error: 'Session expired. Please sign in again.',
                    code: 'SESSION_EXPIRED'
                });
            }
        } 
        else if (!verification.valid) {
            return res.status(403).json({
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        }

        req.userId = verification.decoded.userId;
      
        next();
    }
    catch(err){
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}