import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    emailVerified?: boolean;
    emailOtpHash?: string | null;
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

        password: {
            type: String,
            required: true,
        },

        emailVerified: Boolean,
        emailOtpHash: String,
        otpExpiresAt: Date,
        otpAttempts: Number,
        otpLastSentAt: Date,
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model<IUser>("User", userSchema);