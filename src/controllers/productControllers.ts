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
    const filter: Record<string, unknown> = {};

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string" || !req.query.search.trim()) {
        res.status(400).json({ message: "Search must be a non-empty string" });
        return;
      }
      filter.$text = { $search: req.query.search.trim() };
    }

    if (req.query.category !== undefined) {
      if (typeof req.query.category !== "string" || !req.query.category.trim()) {
        res.status(400).json({ message: "Category must be a non-empty string" });
        return;
      }
      filter.category = req.query.category.trim();
    }

    const priceFilter: { $gte?: number; $lte?: number } = {};
    for (const [key, operator] of [
      ["minPrice", "$gte"],
      ["maxPrice", "$lte"],
    ] as const) {
      const value = req.query[key];
      if (value === undefined) {
        continue;
      }
      if (
        typeof value !== "string" ||
        value.trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      ) {
        res.status(400).json({ message: `${key} must be a non-negative number` });
        return;
      }
      priceFilter[operator] = Number(value);
    }

    if (
      priceFilter.$gte !== undefined &&
      priceFilter.$lte !== undefined &&
      priceFilter.$gte > priceFilter.$lte
    ) {
      res.status(400).json({
        message: "minPrice cannot be greater than maxPrice",
      });
      return;
    }
    if (Object.keys(priceFilter).length > 0) {
      filter.price = priceFilter;
    }

    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      price: { price: 1 },
      "-price": { price: -1 },
      createdAt: { createdAt: 1 },
      "-createdAt": { createdAt: -1 },
      name: { name: 1 },
      "-name": { name: -1 },
      category: { category: 1 },
      "-category": { category: -1 },
    };
    let sort = sortOptions["-createdAt"];
    if (req.query.sort !== undefined) {
      if (
        typeof req.query.sort !== "string" ||
        !sortOptions[req.query.sort]
      ) {
        res.status(400).json({
          message: "sort must be one of price, -price, createdAt, -createdAt, name, -name, category, or -category",
        });
        return;
      }
      sort = sortOptions[req.query.sort];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
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