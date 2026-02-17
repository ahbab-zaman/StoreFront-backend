📘 BACKEND ENGINEERING HANDBOOK
Multi-Vendor Grocery Marketplace

🎯 Project Philosophy

This backend must:
- Be production-ready
- Be scalable
- Be secure
- Be modular
- Follow enterprise-level best practices

The system must be built as if it will support 1M+ users.

🏗 Architecture Standard

We follow Modular Monolith Architecture.

Each module contains:

module/
 ├── controller.ts
 ├── service.ts
 ├── repository.ts
 ├── validator.ts
 ├── routes.ts
 └── types.ts

Controllers:
- Handle request/response only.

Services:
- Contain business logic.

Repository:
- Handle Prisma queries only.

🔐 Authentication Standard

- Access Token: 15 minutes
- Refresh Token: 7 days
- Refresh token rotation enabled
- Sessions stored in database
- OTP hashed before storage
- Password hashed with bcrypt
- Role-based authorization mandatory

💰 Financial Integrity Rules

- Money calculations server-side only
- Use transactions for:
  - Order creation
  - Payment verification
  - Wallet updates
- Commission deducted after delivery only
- Refund must update wallet correctly

🛒 Order Lifecycle Rules

Allowed flow:
PENDING → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED

Restrictions:
- Cannot skip status
- Cannot revert delivered
- Only admin can override

🛡 Security Standards

- Helmet middleware
- CORS whitelist
- Rate limiting
- Centralized error handler
- No raw error exposure
- Lock account after 5 failed login attempts
- Validate env variables at startup

📊 Performance Standards

- Pagination required
- Avoid N+1 queries
- Add indexes for:
  - email
  - orderNumber
  - foreign keys
- Use select to reduce payload
- Implement caching in future phase

🧾 API Response Standard

All APIs must return:

{
  success: boolean,
  message: string,
  data?: object,
  error?: object
}

No raw Prisma response allowed.

🧠 Development Phases

1. Auth & RBAC
2. Store module
3. Product module
4. Cart
5. Order
6. Payment
7. Commission & Wallet
8. Review
9. Coupon
10. Analytics
11. Real-time

🚀 Production Readiness Checklist

- All endpoints validated
- All protected routes authenticated
- Financial operations transactional
- Indexes added
- No sensitive fields exposed
- Logs implemented
- Environment validated