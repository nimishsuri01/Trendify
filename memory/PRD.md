TRENDIFY Product Requirements
Problem statement
Build TRENDIFY, a premium mobile-first fashion e-commerce app where customers discover clothing, manage a bag, place orders, track fulfillment, and manage their account; business owners need protected catalog and order controls.

Architecture
Expo Router / React Native mobile frontend with warm neutral theme tokens.
FastAPI REST backend with MongoDB, JWT authentication, bcrypt password hashing, customer/admin roles.
COD checkout is functional end-to-end. Razorpay is optional and remains disabled until secure credentials are configured.
Local curated fashion imagery is bundled with the app for reliable preview/device rendering.
User personas
Style-conscious customer browsing curated everyday fashion.
Returning customer saving favorites, checking out, and tracking orders.
TRENDIFY operator managing products, order statuses, and business overview.
Core requirements (static)
Premium branded home, discovery/search, category filters, product details, variant selection, wishlist, bag, COD checkout, account, order history/timeline, and protected admin overview.
Server-side totals, validation, authentication, role checks, and MongoDB persistence.
Implemented
2026-03-08: Replaced starter API with catalog seed data, JWT auth, customer/admin roles, product search/filter/sort, wishlist, cart CRUD, COD order creation, order history, admin overview and order status updates.
2026-03-08: Added TRENDIFY home, explore grid, product detail, bag/checkout, account/auth, order timeline, admin studio, theme tokens, local fashion imagery, and tab navigation.
2026-03-08: Added secure Razorpay configuration hooks with COD fallback; online payment remains unavailable until credentials are configured.
Prioritized backlog
P0: Verify core API and Expo preview flows; configure Razorpay test credentials and native checkout when available.
P1: Add admin product edit form, inventory adjustments, coupons, review submission, address book, returns, and password reset.
P2: Add hosted payment fallback for web, push notifications, analytics charts, recommendations, and abandoned-cart messaging.
Next tasks
Add Razorpay test credentials through the secure key card and implement native development-build checkout.
Expand admin studio with product creation/editing and inventory management screens.
Add customer review and returns workflows after the order lifecycle is validated.