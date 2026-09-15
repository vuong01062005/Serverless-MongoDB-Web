import { ObjectId } from "mongodb";
import clientPromise from "../lib/mongodb.js";

async function getJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method)) {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const payload = await getJsonBody(req);

    if (req.method === "POST") {
      const { name, price, quantity } = payload;
      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);

      if (
        !name?.trim() ||
        price === "" ||
        quantity === "" ||
        !Number.isFinite(numericPrice) ||
        !Number.isFinite(numericQuantity)
      ) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập đầy đủ và đúng định dạng sản phẩm",
        });
      }

      const product = {
        name: name.trim(),
        price: numericPrice,
        quantity: numericQuantity,
      };
      const result = await db.collection("products").insertOne(product);

      return res.status(201).json({
        success: true,
        data: { ...product, _id: result.insertedId },
      });
    }

    if (req.method === "PUT") {
      const { id, name, price, quantity } = payload || {};

      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Thiếu hoặc sai mã sản phẩm cần cập nhật",
        });
      }

      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);

      if (
        !name?.trim() ||
        price === "" ||
        quantity === "" ||
        !Number.isFinite(numericPrice) ||
        !Number.isFinite(numericQuantity)
      ) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập đầy đủ và đúng định dạng sản phẩm",
        });
      }

      const result = await db.collection("products").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name: name.trim(),
            price: numericPrice,
            quantity: numericQuantity,
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm để cập nhật",
        });
      }

      const updatedProduct = await db
        .collection("products")
        .findOne({ _id: new ObjectId(id) });

      return res.status(200).json({
        success: true,
        data: updatedProduct,
      });
    }

    if (req.method === "DELETE") {
      const { id } = payload || {};

      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Thiếu hoặc sai mã sản phẩm cần xóa",
        });
      }

      const result = await db.collection("products").deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm để xóa",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Sản phẩm đã được xóa",
        data: { id },
      });
    }

    const products = await db.collection("products").find({}).toArray();

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý products:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể xử lý dữ liệu sản phẩm",
    });
  }
}