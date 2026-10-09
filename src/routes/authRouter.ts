import { Router } from "express";
import {
    loginUser,
    registerUser,
    resendRegistrationOtps,
    verifyRegistrationOtp,
} from "../controllers/authController";

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register and send an email verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       "201": { description: Verification email sent }
 *       "400": { description: Invalid request }
 *       "409": { description: Email already registered }
 *       "502": { description: Verification email delivery failed }
 */
router.post("/register", registerUser);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify the email code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, emailOtp]
 *             properties:
 *               email: { type: string, format: email }
 *               emailOtp: { type: string, example: "123456" }
 *     responses:
 *       "200": { description: Email verified }
 *       "400": { description: Invalid or expired codes }
 *       "429": { description: Too many incorrect codes }
 */
router.post("/verify-otp", verifyRegistrationOtp);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend the email verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       "200": { description: Code sent if account needs verification }
 *       "429": { description: Resend cooldown has not elapsed }
 *       "502": { description: Verification email delivery failed }
 */
router.post("/resend-otp", resendRegistrationOtps);
router.post("/login", loginUser);

export default router;
