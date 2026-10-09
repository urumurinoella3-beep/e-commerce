import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { sendSms } from "../utils/sendSms";

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

const issueOtps = async (user: InstanceType<typeof User>): Promise<void> => {
	if (!user.phone) {
		throw new Error("A phone number is required to send verification codes");
	}

	const emailOtp = createOtp();
	const phoneOtp = createOtp();

	user.emailOtpHash = await bcrypt.hash(emailOtp, 10);
	user.phoneOtpHash = await bcrypt.hash(phoneOtp, 10);
	user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
	user.otpAttempts = 0;
	user.otpLastSentAt = new Date();
	await user.save();

	try {
		await Promise.all([
			sendEmail(
				user.email,
				"Verify your account",
				`<p>Hello ${escapeHtml(user.name)},</p><p>Your email verification code is <strong>${emailOtp}</strong>.</p><p>It expires in 10 minutes.</p>`
			),
			sendSms(
				user.phone,
				`Your verification code is ${phoneOtp}. It expires in 10 minutes.`
			),
		]);
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
		const { name, email, phone, password } = req.body;

		if (
			typeof name !== "string" ||
			typeof email !== "string" ||
			typeof phone !== "string" ||
			typeof password !== "string" ||
			!name.trim() ||
			!email.trim() ||
			!phone.trim() ||
			!password
		) {
			res.status(400).json({
				message: "Name, email, phone, and password are required",
			});
			return;
		}

		const normalizedEmail = email.trim().toLowerCase();
		const normalizedPhone = phone.trim();
		if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
			res.status(400).json({
				message: "Phone must be in international E.164 format, such as +2507XXXXXXXX",
			});
			return;
		}

		const existingUser = await User.findOne({
			$or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
		});

		if (existingUser) {
			res.status(409).json({
				message: "Email or phone is already registered",
			});
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await User.create({
			name: name.trim(),
			email: normalizedEmail,
			phone: normalizedPhone,
			password: hashedPassword,
			emailVerified: false,
			phoneVerified: false,
		});

		try {
			await issueOtps(user);
		} catch (error) {
			console.error("OTP delivery failed:", error);
			res.status(502).json({
				message: "Account created but verification codes could not be sent. Request new codes shortly",
			});
			return;
		}

		res.status(201).json({
			message: "Verification codes sent to your email and phone",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				phone: user.phone,
			},
		});
	} catch (error) {
		console.error("Registration failed:", error);
		res.status(500).json({
			message: "Failed to register user",
		});
	}
};

export const verifyRegistrationOtps = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email, emailOtp, phoneOtp } = req.body;

		if (
			typeof email !== "string" ||
			typeof emailOtp !== "string" ||
			typeof phoneOtp !== "string" ||
			!/^\d{6}$/.test(emailOtp) ||
			!/^\d{6}$/.test(phoneOtp)
		) {
			res.status(400).json({
				message: "Email and both six-digit verification codes are required",
			});
			return;
		}

		const user = await User.findOne({ email: email.trim().toLowerCase() });
		if (!user || user.emailVerified || user.phoneVerified) {
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
			!user.emailOtpHash ||
			!user.phoneOtpHash
		) {
			res.status(400).json({
				message: "Verification codes expired. Request new codes",
			});
			return;
		}

		const [emailMatches, phoneMatches] = await Promise.all([
			bcrypt.compare(emailOtp, user.emailOtpHash),
			bcrypt.compare(phoneOtp, user.phoneOtpHash),
		]);

		if (!emailMatches || !phoneMatches) {
			user.otpAttempts = (user.otpAttempts ?? 0) + 1;
			await user.save();
			res.status(400).json({ message: "Invalid verification codes" });
			return;
		}

		user.emailVerified = true;
		user.phoneVerified = true;
		user.emailOtpHash = null;
		user.phoneOtpHash = null;
		user.otpExpiresAt = null;
		user.otpAttempts = 0;
		await user.save();

		res.status(200).json({ message: "Email and phone verified. You can now log in" });
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
		if (!user || user.emailVerified || user.phoneVerified || !user.phone) {
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

		await issueOtps(user);
		res.status(200).json({ message: "New verification codes sent" });
	} catch (error) {
		console.error("Resending verification codes failed:", error);
		res.status(502).json({
			message: "Could not send verification codes. Check Brevo configuration",
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

		if (user.emailVerified === false || user.phoneVerified === false) {
			res.status(403).json({
				message: "Verify your email and phone before logging in",
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
