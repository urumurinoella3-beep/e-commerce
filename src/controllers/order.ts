import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/order";
import Product from "../models/product";

export const createOrder = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { productId } = req.body;
		const quantity = Number(req.body.quantity);

		if (
			!req.userId ||
			typeof productId !== "string" ||
			!mongoose.Types.ObjectId.isValid(productId)
		) {
			res.status(400).json({
				message: "A valid productId is required",
			});
			return;
		}

		if (!Number.isInteger(quantity) || quantity < 1) {
			res.status(400).json({
				message: "Quantity must be a positive whole number",
			});
			return;
		}

		const existingProduct = await Product.findById(productId);

		if (!existingProduct) {
			res.status(404).json({
				message: "Product not found",
			});
			return;
		}

		const product = await Product.findOneAndUpdate(
			{ _id: productId, quantity: { $gte: quantity } },
			{ $inc: { quantity: -quantity } },
			{ new: true }
		);

		if (!product) {
			res.status(400).json({
				message: "Not enough product stock for this order",
			});
			return;
		}

		try {
			const order = await Order.create({
				userId: req.userId,
				productId: product._id,
				quantity,
				totalPrice: product.price * quantity,
			});

			res.status(201).json({
				message: "Order placed successfully",
				order,
			});
		} catch (error) {
			await Product.updateOne(
				{ _id: product._id },
				{ $inc: { quantity } }
			);
			throw error;
		}
	} catch {
		res.status(500).json({
			message: "Failed to place order",
		});
	}
};

export const getMyOrders = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		if (!req.userId) {
			res.status(401).json({
				message: "Authentication is required",
			});
			return;
		}

		const parsePositiveInteger = (value: unknown, fallback: number): number => {
			if (typeof value !== "string" || value.trim() === "") {
				return fallback;
			}

			const parsed = Number(value);
			return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
		};
		const page = parsePositiveInteger(req.query.page, 1);
		const limit = Math.min(parsePositiveInteger(req.query.limit, 10), 50);
		const skip = (page - 1) * limit;
		const filter = { userId: req.userId };
		const [orders, total] = await Promise.all([
			Order.find(filter)
				.populate("productId", "name category price imageUrl")
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Order.countDocuments(filter),
		]);
		const totalPages = Math.ceil(total / limit);

		res.status(200).json({
			data: orders,
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1,
			},
		});
	} catch {
		res.status(500).json({
			message: "Failed to fetch orders",
		});
	}
};

export const getMyOrderById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;

		if (!req.userId) {
			res.status(401).json({
				message: "Authentication is required",
			});
			return;
		}

		if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({
				message: "Invalid order ID",
			});
			return;
		}

		const order = await Order.findOne({ _id: id, userId: req.userId })
			.populate("productId", "name category price imageUrl");

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		res.status(200).json(order);
	} catch {
		res.status(500).json({
			message: "Failed to fetch order",
		});
	}
};
