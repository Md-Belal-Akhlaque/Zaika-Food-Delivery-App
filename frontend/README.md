# Frontend Documentation (Zaika)

This directory contains the React + Vite frontend for the Zaika food delivery app.

For complete project setup, architecture, backend APIs, and role flows, see the root [README.md](../README.md).

## Tech Stack

- React 19
- Vite 7
- Redux Toolkit
- React Router
- Tailwind CSS
- Socket.IO client
- Leaflet (map/location)

## Key Frontend Modules

- App and routing:
  - `src/main.jsx`
  - `src/App.jsx`
- Global data bootstrap:
  - `src/components/GlobalDataProvider.jsx`
- State slices:
  - `src/redux/userSlice.js`
  - `src/redux/ownerSlice.js`
  - `src/redux/mapSlice.js`
  - `src/redux/cartSlice.js`
  - `src/redux/orderSlice.js`
- API + realtime hooks:
  - `src/hooks/useApi.js`
  - `src/hooks/useSocket.js`
  - `src/config/socket.js`
- Role dashboards:
  - `src/components/UserDashboard.jsx`
  - `src/components/OwnerDashboard.jsx`
  - `src/components/DeliveryPartnerDashboard.jsx`

## Environment Variables

Create `frontend/.env` (you can copy from `frontend/.env.example`) with:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_GEOAPIKEY=your_geoapify_key
```

Important:

- If `VITE_API_URL` is empty, API requests fall back to relative `/api` and use `vite.config.js` proxy.
- Current proxy target in `vite.config.js` is `http://localhost:5000`.
- If `VITE_SOCKET_URL` is not set, socket client default is `http://localhost:5000`.

Set both values explicitly if your backend runs on a non-default port.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Role-aware Pages

- Customer: home feed, cart, checkout, payment, order history, live tracking, rating
- Owner: create/edit shop, menu management, owner orders, owner earnings
- Delivery partner: availability toggle, assignment acceptance, pickup/delivered flow, earnings
