import { v2 as cloudinary } from "cloudinary";

export const uploadProductImage = (fileBuffer: Buffer): Promise<string> => {
	const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
	const apiKey = process.env.CLOUDINARY_API_KEY;
	const apiSecret = process.env.CLOUDINARY_API_SECRET;

	if (!cloudName || !apiKey || !apiSecret) {
		throw new Error("Cloudinary environment variables are not configured");
	}

	cloudinary.config({
		cloud_name: cloudName,
		api_key: apiKey,
		api_secret: apiSecret,
		secure: true,
	});

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{ folder: "e-commerce/products", resource_type: "image" },
			(error, result) => {
				if (error) {
					reject(error);
					return;
				}

				if (!result) {
					reject(new Error("Cloudinary did not return an uploaded image"));
					return;
				}

				resolve(result.secure_url);
			}
		);

		uploadStream.end(fileBuffer);
	});
};
