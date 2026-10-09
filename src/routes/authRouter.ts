import { Router } from "express";
import {
    loginUser,
    registerUser,
    resendRegistrationOtps,
    verifyRegistrationOtps,
} from "../controllers/authController";

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register and send email and phone verification codes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "+250788123456" }
 *               password: { type: string }
 *     responses:
 *       "201": { description: Verification codes sent }
 *       "400": { description: Invalid request }
 *       "409": { description: Email or phone already registered }
 *       "502": { description: Verification delivery failed }
 */
router.post("/register", registerUser);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify the email and phone codes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, emailOtp, phoneOtp]
 *             properties:
 *               email: { type: string, format: email }
 *               emailOtp: { type: string, example: "123456" }
 *               phoneOtp: { type: string, example: "654321" }
 *     responses:
 *       "200": { description: Email and phone verified }
 *       "400": { description: Invalid or expired codes }
 *       "429": { description: Too many incorrect codes }
 */
router.post("/verify-otp", verifyRegistrationOtps);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend verification codes
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
 *       "200": { description: Codes sent if account needs verification }
 *       "429": { description: Resend cooldown has not elapsed }
 *       "502": { description: Verification delivery failed }
 */
router.post("/resend-otp", resendRegistrationOtps);
router.post("/login", loginUser);

export default router;
