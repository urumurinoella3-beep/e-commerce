import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
	namespace Express {
		interface Request {
			userId?: string;
		}
	}
}

const authenticateUser = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const authorization = req.headers.authorization;

	if (!authorization?.startsWith("Bearer ")) {
		res.status(401).json({
			message: "A valid Bearer token is required",
		});
		return;
	}

	const jwtSecret = process.env.JWT_SECRET;

	if (!jwtSecret) {
		res.status(500).json({
			message: "JWT_SECRET is not configured",
		});
		return;
	}

	try {
		const token = authorization.slice("Bearer ".length);
		const decoded = jwt.verify(token, jwtSecret);

		if (typeof decoded === "string" || typeof decoded.userId !== "string") {
			res.status(401).json({
				message: "Invalid token",
			});
			return;
		}

		req.userId = decoded.userId;
		next();
	} catch {
		res.status(401).json({
			message: "Invalid or expired token",
		});
	}
};

export default authenticateUser;
