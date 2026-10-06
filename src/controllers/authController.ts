import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export const registerUser = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { name, email, password } = req.body;

		if (
			typeof name !== "string" ||
			typeof email !== "string" ||
			typeof password !== "string" ||
			!name.trim() ||
			!email.trim() ||
			!password
		) {
			res.status(400).json({
				message: "Name, email, and password are required",
			});
			return;
		}

		const normalizedEmail = email.trim().toLowerCase();
		const existingUser = await User.findOne({ email: normalizedEmail });

		if (existingUser) {
			res.status(409).json({
				message: "Email is already registered",
			});
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await User.create({
			name: name.trim(),
			email: normalizedEmail,
			password: hashedPassword,
		});

		res.status(201).json({
			message: "User registered successfully",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch {
		res.status(500).json({
			message: "Failed to register user",
		});
	}
};

export const loginUser = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email, password } = req.body;

		if (
			typeof email !== "string" ||
			typeof password !== "string" ||
			!email.trim() ||
			!password
		) {
			res.status(400).json({
				message: "Email and password are required",
			});
			return;
		}

		const normalizedEmail = email.trim().toLowerCase();
		const user = await User.findOne({ email: normalizedEmail });

		if (!user || !(await bcrypt.compare(password, user.password))) {
			res.status(401).json({
				message: "Invalid email or password",
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

		const token = jwt.sign(
			{ userId: user._id.toString() },
			jwtSecret,
			{ expiresIn: "1h" }
		);

		res.status(200).json({
			message: "Login successful",
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch {
		res.status(500).json({
			message: "Failed to log in",
		});
	}
};
