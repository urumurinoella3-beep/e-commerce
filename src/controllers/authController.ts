import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_WAIT_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const escapeHtml = (value: string): string =>
	value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return entities[character];
	});

const createOtp = (): string =>
	randomInt(0, 1_000_000).toString().padStart(6, "0");

const issueOtp = async (user: InstanceType<typeof User>): Promise<void> => {
	const otp = createOtp();

	user.emailOtpHash = await bcrypt.hash(otp, 10);
	user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
	user.otpAttempts = 0;
	user.otpLastSentAt = new Date();
	await user.save();

	try {
		await sendEmail(
			user.email,
			"Verify your account",
			`<p>Hello ${escapeHtml(user.name)},</p><p>Your email verification code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
		);
	} catch (error) {
		user.otpLastSentAt = null;
		await user.save();
		throw error;
	}
};

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
			emailVerified: false,
		});

		try {
			await issueOtp(user);
		} catch (error) {
			console.error("Email verification delivery failed:", error);
			res.status(502).json({
				message: "Account created but the verification email could not be sent. Request a new code shortly",
			});
			return;
		}

		res.status(201).json({
			message: "Verification code sent to your email",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		console.error("Registration failed:", error);
		res.status(500).json({
			message: "Failed to register user",
		});
	}
};

export const verifyRegistrationOtp = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email, emailOtp } = req.body;

		if (
			typeof email !== "string" ||
			typeof emailOtp !== "string" ||
			!/^\d{6}$/.test(emailOtp)
		) {
			res.status(400).json({
				message: "Email and a six-digit verification code are required",
			});
			return;
		}

		const user = await User.findOne({ email: email.trim().toLowerCase() });
		if (!user || user.emailVerified) {
			res.status(400).json({ message: "Invalid verification request" });
			return;
		}

		if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
			res.status(429).json({
				message: "Too many incorrect codes. Request new codes before trying again",
			});
			return;
		}

		if (
			!user.otpExpiresAt ||
			user.otpExpiresAt.getTime() <= Date.now() ||
			!user.emailOtpHash
		) {
			res.status(400).json({
				message: "Verification code expired. Request a new code",
			});
			return;
		}

		const emailMatches = await bcrypt.compare(emailOtp, user.emailOtpHash);

		if (!emailMatches) {
			user.otpAttempts = (user.otpAttempts ?? 0) + 1;
			await user.save();
			res.status(400).json({ message: "Invalid verification code" });
			return;
		}

		user.emailVerified = true;
		user.emailOtpHash = null;
		user.otpExpiresAt = null;
		user.otpAttempts = 0;
		await user.save();

		try {
			await sendEmail(
				user.email,
				"Welcome to My Shop - Registration successful",
				`<p>Hello ${escapeHtml(user.name)}, your account has been verified and registered successfully. You can now log in and start shopping.</p>`
			);
		} catch (error) {
			console.error("Welcome email delivery failed:", error);
		}

		res.status(200).json({ message: "Email verified. You can now log in" });
	} catch (error) {
		console.error("OTP verification failed:", error);
		res.status(500).json({ message: "Failed to verify codes" });
	}
};

export const resendRegistrationOtps = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email } = req.body;
		if (typeof email !== "string" || !email.trim()) {
			res.status(400).json({ message: "Email is required" });
			return;
		}

		const user = await User.findOne({ email: email.trim().toLowerCase() });
		if (!user || user.emailVerified) {
			res.status(200).json({
				message: "If the account needs verification, new codes will be sent",
			});
			return;
		}

		const waitUntil = (user.otpLastSentAt?.getTime() ?? 0) + OTP_RESEND_WAIT_MS;
		if (waitUntil > Date.now()) {
			res.status(429).json({
				message: `Please wait ${Math.ceil((waitUntil - Date.now()) / 1000)} seconds before requesting new codes`,
			});
			return;
		}

		await issueOtp(user);
		res.status(200).json({ message: "New verification code sent" });
	} catch (error) {
		console.error("Resending verification email failed:", error);
		res.status(502).json({
			message: "Could not send verification email. Check Brevo configuration",
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

		if (!user.emailVerified) {
			res.status(403).json({
				message: "Verify your email before logging in",
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
	} catch (error) {
		console.error("Login failed:", error);
		res.status(500).json({
			message: "Failed to log in",
		});
	}
};
