import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import AuthConfig from "../config/authConfig";
import { CustomRequest, JwtPayload } from "../interfaces/auth";

export const checkAdminAuth = (
    req: CustomRequest,
    res: Response,
    next: NextFunction
) => {
    const tokenHeader = req.headers["authorization"];

    if (!tokenHeader) {
        res.status(410).json({ message: "UnAuthorized Request" });
    }

    const token = tokenHeader && tokenHeader.split(" ")[1];

    jwt.verify(String(token), String(AuthConfig.JWT_SECRET), (err, decoded) => {
        if (err) {
            res.status(410).json({ message: "Invalid Token" });
        }

        const decodedPayload = decoded as JwtPayload;
        req.authId = decodedPayload.authId;
        req.email = decodedPayload.email;
        req.role = decodedPayload.role;

        if (req.role === "Admin") {
            next();
        } else {
            res.status(403).json({ message: `Required role is admin current role: ${req.role}` });
        }

    });
};
