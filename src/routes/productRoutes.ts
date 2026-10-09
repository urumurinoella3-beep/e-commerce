import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productControllers";
import upload from "../middleware/uploadMiddleware";

const router = Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List products with filtering, search, sorting, and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price, -price, createdAt, -createdAt, name, -name, category, -category]
 *     responses:
 *       "200":
 *         description: Paginated products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { type: object } }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *                     hasNextPage: { type: boolean }
 *                     hasPrevPage: { type: boolean }
 *       "400": { description: Invalid query parameter }
 */
router.post("/", upload.single("image"), createProduct);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;