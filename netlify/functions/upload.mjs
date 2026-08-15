import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return Response.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return Response.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 400 }
      );
    }

    const extension =
      file.type.split("/")[1] || "jpg";

    const filename =
      `product-${Date.now()}.${extension}`;

    const store = getStore("veya-images");

    await store.set(filename, file);

    return Response.json({
      success: true,
      filename
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
};
