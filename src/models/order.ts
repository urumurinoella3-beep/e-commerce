import mongoose, { Document, Schema } from "mongoose";

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface IOrder extends Document {
	userId: mongoose.Types.ObjectId;
	productId: mongoose.Types.ObjectId;
	quantity: number;
	totalPrice: number;
	status: OrderStatus;
	createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
			validate: Number.isInteger,
		},
		totalPrice: {
			type: Number,
			required: true,
			min: 0,
		},
		status: {
			type: String,
			enum: ["PENDING", "CONFIRMED", "CANCELLED"],
			default: "PENDING",
		},
	},
	{
		timestamps: true,
	}
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
