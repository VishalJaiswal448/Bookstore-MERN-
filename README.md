# Bookestro — MERN Multi-Vendor Bookstore

Bookestro is a responsive full-stack bookstore marketplace built with **React + Vite, Node.js + Express, MongoDB/Mongoose and Razorpay**.

## Roles and modules

### Customer
- Registration and secure login
- Browse products
- Search and category filters
- Book details
- Wishlist
- Shopping cart
- Secure Razorpay checkout
- Order history

### Seller
- Secure seller login
- Seller dashboard
- Add/edit/delete own books
- Active category selection
- Inventory/stock management
- Seller cannot edit another seller's products

### Administrator
- Secure admin login
- Admin dashboard and store statistics
- User management: search, role changes, activate/deactivate
- Product management: add/edit/delete products and assign sellers
- Category management: create/edit/archive/activate
- Order management: view and update fulfilment status
- Inventory monitoring and low-stock alerts

## Security

- JWT session stored in an HTTP-only cookie
- CSRF protection for browser state-changing requests
- bcrypt password hashing
- Role-based API authorization
- Server-side input validation
- Server-side product price/stock calculation during checkout
- Razorpay signature and amount/currency verification
- Razorpay webhook HMAC verification
- Rate limiting
- Restricted CORS
- Security response headers
- Secrets are kept in backend environment variables
- Inactive users cannot sign in

## Local setup

### Prerequisites

- Node.js 20+ (tested source target; recommended 22 LTS)
- MongoDB local or MongoDB Atlas
- Razorpay account for payment testing

### 1. Configure backend

### 2. Install dependencies

From the project root:

```bash
npm run install-all
```

### 3. Seed/repair demo data

```bash
npm run seed --prefix backend
```

The seed script is **non-destructive**. It creates/repairs the demo admin, seller and categories and inserts demo books only when the database has no books.

Default local demo accounts:

```text
Seller
seller@gmail.com
happy12345
```

You may override the demo/admin credentials before running the seed script:

```

### 4. Start backend

```bash
npm run dev --prefix backend
```

Backend health:

```text
http://localhost:5000/api/health
```

Root API response:

```text
http://localhost:5000/
```

### 5. Start frontend

In a second terminal:

```bash
npm run dev --prefix frontend
```

Open:

```text
http://localhost:5173
```

The Vite development server proxies `/api` to `http://localhost:5000`.

## Admin login troubleshooting

If the admin account shows **Invalid email or password**:

1. Make sure the backend is connected to the MongoDB database you expect.
2. Run the non-destructive admin repair command:

3. Restart the backend.
4. Log out of Bookestro and sign in again.
5. Use the exact email/password configured in `SELLER_EMAIL` and `SELLER_PASSWORD`.

Use `npm run seed --prefix backend` only when you also want to create/repair the demo seller, categories and initial books. The seed script does not delete existing products/orders. The admin repair command only repairs the admin account.

The login page also provides the demo Admin/Seller fill buttons while running in Vite development mode.

## Razorpay setup

Use **Razorpay Test Mode** during development.

The browser receives only the public Key ID. The backend uses the secret key to create Razorpay Orders. The application then verifies the checkout signature and fetches the payment from Razorpay before marking the local order as paid.

The server also validates webhook signatures. Configure a webhook in Razorpay Dashboard for:

```text
https://YOUR-DOMAIN.com/api/payments/webhook
```

Recommended webhook events include successful payment/order events and failed-payment events. Webhooks are a server-to-server recovery/notification path; user-facing checkout confirmation is still verified immediately through the backend API.

For production, enable the appropriate Razorpay automatic capture settings and replace test credentials with live credentials.

## Payment flow

```text
Customer
  ↓
React checkout
  ↓
POST /api/payments/create-order
  ↓
Express recalculates price + stock from MongoDB
  ↓
Razorpay Orders API
  ↓
Razorpay Checkout
  ↓
POST /api/payments/verify
  ↓
Signature + payment order + amount + currency + captured status verified
  ↓
Book stock reduced
  ↓
Order marked Paid / Placed
  ↓
Razorpay webhook provides asynchronous recovery/notification
```

## Production deployment

The recommended deployment is **one HTTPS web service** where Express serves `frontend/dist`. This keeps the session cookie same-origin.

### Environment variables

Set these in your hosting provider:

```text
NODE_ENV=production
MONGO_URI=your-mongodb-atlas-uri
JWT_SECRET=your-long-random-production-secret
CLIENT_URL=https://your-domain.example
RAZORPAY_KEY_ID=your-live-key-id
RAZORPAY_KEY_SECRET=your-live-key-secret
RAZORPAY_WEBHOOK_SECRET=your-live-webhook-secret
COOKIE_SAMESITE=Lax
```

### Render

The repository includes `render.yaml`.

Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

Health check:

```text
/api/health
```

### Docker

```bash
docker build -t bookestro .
docker run --env-file backend/.env -p 5000:5000 bookestro
```

## API overview

### Authentication
- `GET /api/auth/csrf`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Products
- `GET /api/books`
- `GET /api/books/categories`
- `GET /api/books/recommendations`
- `GET /api/books/:id`
- `GET /api/books/mine` (seller/admin)
- `POST /api/books` (seller/admin)
- `PUT /api/books/:id` (seller/admin)
- `DELETE /api/books/:id` (seller/admin)

### Wishlist
- `GET /api/wishlist` (customer)
- `POST /api/wishlist/:bookId` (customer)
- `DELETE /api/wishlist/:bookId` (customer)

### Orders
- `GET /api/orders/mine` (customer)
- `GET /api/orders` (admin)
- `PATCH /api/orders/:id` (admin)

### Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`

### Payments
- `POST /api/payments/create-order` (customer)
- `POST /api/payments/verify` (customer)
- `POST /api/payments/webhook` (Razorpay)

## Project structure

```text
Bookestro-MERN-Bookstore/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── bookController.js
│   │   │   ├── orderController.js
│   │   │   ├── paymentController.js
│   │   │   └── wishlistController.js
│   │   ├── middleware/
│   │   ├── models/
│   │   │   ├── Book.js
│   │   │   ├── Category.js
│   │   │   ├── Order.js
│   │   │   ├── User.js
│   │   │   └── Wishlist.js
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── Admin.jsx
│   │   │   ├── Wishlist.jsx
│   │   │   └── ...
│   │   └── services/
│   └── .env.example
├── Dockerfile
├── render.yaml
├── package.json
└── README.md
```
