import { getStore } from "@netlify/blobs";

const store = getStore("veya-products");

export default async (request) => {
  try {
    if (request.method === "GET") {
      const products = await store.get("products", {
        type: "json"
      });

      return Response.json(products || []);
    }

    if (request.method === "POST") {
      const product = await request.json();

      if (!product.name || !product.price) {
        return Response.json(
          { error: "Name and price are required" },
          { status: 400 }
        );
      }

      const products = await store.get("products", {
        type: "json"
      }) || [];

      const newProduct = {
        id: Date.now(),
        name: product.name,
        price: Number(product.price),
        description: product.description || "",
        image: product.image || ""
      };

      products.push(newProduct);

      await store.setJSON("products", products);

      return Response.json(newProduct);
    }

    if (request.method === "DELETE") {
      const { id } = await request.json();

      let products = await store.get("products", {
        type: "json"
      }) || [];

      products = products.filter(
        product => product.id !== Number(id)
      );

      await store.setJSON("products", products);

      return Response.json({ success: true });
    }

    return new Response("Method not allowed", {
      status: 405
    });

  } catch (error) {

    console.error(error);

    return Response.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
};
