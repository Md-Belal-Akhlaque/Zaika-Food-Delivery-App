import test from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";

const startServer = () =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });

const stopServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

test("POST /api/order/create requires authentication", async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/order/create`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cartItems: [] }),
    });
    assert.equal(res.status, 401);
  } finally {
    await stopServer(server);
  }
});

test("POST /api/order/:orderId/retry-payment requires authentication", async () => {
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/order/1234567890abcdef12345678/retry-payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 401);
  } finally {
    await stopServer(server);
  }
});
