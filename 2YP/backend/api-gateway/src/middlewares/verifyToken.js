const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    /*
    .split(' ') splits the string by spaces into an array:
    ["Bearer", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."]

    // Debug logs for troubleshooting
    console.log("Token received in verifyToken:", token);
    console.log("JWT_SECRET used:", process.env.JWT_SECRET ? "Loaded" : "NOT loaded");
*/
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("JWT verification error:", err.message);
            return res.status(403).json({ message: "Invalid token." });
        }

        req.user = decoded; // Attach decoded payload to request
        next();
    });
};

module.exports = verifyToken;