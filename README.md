VEYA FINAL STORE — DEPLOYMENT PACKAGE

WHAT'S INCLUDED
- Public storefront
- Purses / Wallets / Glasses / Watches
- Search + category filters
- Cart
- Real server-side COD order API
- SQLite database for products/orders
- Admin login
- Admin product upload/create/delete
- Admin order status management
- Image uploads
- Responsive design

IMPORTANT BEFORE GOING LIVE
1. Set ADMIN_USER, ADMIN_PASSWORD and SESSION_SECRET as environment variables.
2. Use a persistent disk/volume for the SQLite database and uploads on your hosting provider.
3. Use HTTPS.
4. Replace the placeholder WhatsApp link in public/index.html with your real business WhatsApp link.
5. Configure your Markaz fulfillment workflow separately. This website records COD orders; it does not automatically place Markaz orders.
6. Test several fake orders before accepting real customers.

RUN LOCALLY
1. Install Node.js 20+.
2. Open this folder in a terminal.
3. Run: npm install
4. Set environment variables (copy .env.example to .env if using a dotenv loader, or set them in your shell/hosting dashboard).
5. Run: npm start
6. Open http://localhost:3000
7. Admin: http://localhost:3000/admin.html

HOSTING
Use a Node.js host such as Render, Railway, Fly.io, or another provider that supports Node/Express.
For production, ensure the SQLite file and uploads directory are on persistent storage.
