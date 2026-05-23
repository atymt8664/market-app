import assert from "node:assert/strict";
import { buildWsUrl } from "./build-ws-url.ts";

assert.equal(
  buildWsUrl({
    apiBaseUrl: "https://api.example.com",
    wsHttpOriginOverride: "",
    isProd: true,
    windowProtocol: "https:",
    windowHost: "www.example.com",
  }),
  "wss://api.example.com/api/ws",
);

assert.equal(
  buildWsUrl({
    apiBaseUrl: "http://127.0.0.1:3001",
    wsHttpOriginOverride: "",
    isProd: false,
    windowProtocol: "http:",
    windowHost: "localhost:5173",
  }),
  "ws://127.0.0.1:3001/api/ws",
);

assert.equal(
  buildWsUrl({
    apiBaseUrl: "",
    wsHttpOriginOverride: "https://staging-api.example.com",
    isProd: true,
    windowProtocol: "https:",
    windowHost: "www.souq-arab.com",
  }),
  "wss://staging-api.example.com/api/ws",
);

assert.equal(
  buildWsUrl({
    apiBaseUrl: "",
    wsHttpOriginOverride: "",
    isProd: true,
    windowProtocol: "https:",
    windowHost: "www.souq-arab.com",
  }),
  "wss://www.souq-arab.com/api/ws",
);

assert.equal(
  buildWsUrl({
    apiBaseUrl: "",
    wsHttpOriginOverride: "",
    isProd: false,
    windowProtocol: "http:",
    windowHost: "localhost:5173",
  }),
  "ws://localhost:5173/api/ws",
);

assert.equal(
  buildWsUrl({
    apiBaseUrl: "https://api.example.com",
    wsHttpOriginOverride: "https://ignored.example.com",
    isProd: true,
    windowProtocol: "https:",
    windowHost: "www.example.com",
  }),
  "wss://api.example.com/api/ws",
);

console.log("build-ws-url.test.mjs: PASS");
