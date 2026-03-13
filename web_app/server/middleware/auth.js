const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'dev_secret_key';

/**
 * Middleware: verifica que el request tenga un JWT válido.
 * Adjunta req.user con los datos decodificados del token.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

/**
 * Middleware: verifica que el usuario tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS de authenticate.
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para esta acción' });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
