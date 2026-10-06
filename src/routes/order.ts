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
router.get("/", getMyOrders);
router.get("/:id", getMyOrderById);

export default router;
