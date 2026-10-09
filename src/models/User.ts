import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    emailOtpHash?: string | null;
    phoneOtpHash?: string | null;
    otpExpiresAt?: Date | null;
    otpAttempts?: number;
    otpLastSentAt?: Date | null;
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        emailVerified: Boolean,
        phoneVerified: Boolean,
        emailOtpHash: String,
        phoneOtpHash: String,
        otpExpiresAt: Date,
        otpAttempts: Number,
        otpLastSentAt: Date,
    },
    {
        timestamps: true,
    }
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>("User", userSchema);