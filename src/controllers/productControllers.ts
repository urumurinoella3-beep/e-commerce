import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product";
import { uploadProductImage } from "../config/cloudinary";

// CREATE
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, category, price, description, quantity } = req.body;

    if (
      typeof name !== "string" ||
      typeof category !== "string" ||
      typeof description !== "string" ||
      !name.trim() ||
      !category.trim() ||
      !description.trim() ||
      price === undefined ||
      quantity === undefined ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      res.status(400).json({
        message: "Valid name, category, description, price, and quantity are required",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        message: "Please upload a product image using the image field",
      });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)) {
      res.status(400).json({
        message: "Image must be a JPEG, PNG, or WebP file",
      });
      return;
    }

    const imageUrl = await uploadProductImage(req.file.buffer);

    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      description: description.trim(),
      quantity: Number(quantity),
      imageUrl,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        message: "Invalid product data",
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Failed to create product",
      error,
    });
  }
};

// GET ALL
export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await Product.find();

    res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error,
    });
  }
};

// GET ONE
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message: "Invalid product ID",
      });
      return;
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        message: "Product not found",
      });
      return;
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error,
    });
  }
};

// UPDATE
export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message: "Invalid product ID",
      });
      return;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      res.status(404).json({
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        message: "Invalid product data",
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Failed to update product",
      error,
    });
  }
};

// DELETE
export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message: "Invalid product ID",
      });
      return;
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404).json({
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error,
    });
  }
};