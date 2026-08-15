import { getStore } from "@netlify/blobs";

export default async (request) => {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get("file");

    if (!filename) {
      return new Response("Missing image", { status: 400 });
    }

    const store = getStore("veya-images");

    const image = await store.get(filename, {
      type: "arrayBuffer"
    });

    if (!image) {
      return new Response("Image not found", { status: 404 });
    }

    const extension = filename.split(".").pop().toLowerCase();

    const types = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif"
    };

    return new Response(image, {
      headers: {
        "Content-Type": types[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000"
      }
    });

  } catch (error) {
    console.error(error);

    return new Response("Image error", {
      status: 500
    });
  }
};
