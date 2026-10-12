# Multi-Vendor Marketplace

## Run the backend
cd server
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run seed           # creates demo admin/vendor/customer + sample products
npm run dev            # http://localhost:5000/api/health

## Demo accounts (after seeding)
- admin@market.test / admin123
- vendor@market.test / vendor123
- customer@market.test / customer123

## Create the frontend (from the marketplace folder)
npx create-next-app@latest client
cd client && npm i @reduxjs/toolkit react-redux axios
