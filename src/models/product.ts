import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  category: string;
  price: number;
  description: string;
  quantity: number;
  imageUrl: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    imageUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model<IProduct>(
  "Product",
  productSchema
);

export default Product;