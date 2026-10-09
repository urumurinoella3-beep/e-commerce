import { Router } from "express";
import authenticateUser from "../middleware/authMiddleware";
import {
	createOrder,
	getMyOrderById,
	getMyOrders,
} from "../controllers/order";

const router = Router();

router.use(authenticateUser);
router.post("/", createOrder);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: List the authenticated user's orders with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       "200":
 *         description: Paginated orders belonging to the authenticated user
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
 *       "401": { description: Authentication required }
 */
router.get("/", getMyOrders);
router.get("/:id", getMyOrderById);

export default router;
