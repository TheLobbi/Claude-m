#!/usr/bin/env node
/**
 * Standalone HTTPS webhook receiver for Microsoft Graph change notifications.
 *
 * Run as its own process:
 *     pnpm receiver                                            # listens on port 7878 by default
 *     MSGO_RECEIVER_PORT=8443 MSGO_RECEIVER_CLIENT_STATE=... pnpm receiver
 *
 * Expose to the public internet via Cloudflare Tunnel / ngrok / Azure Function.
 * The notificationUrl you pass to subscriptions_create must match whatever
 * public URL terminates at this receiver.
 *
 * Three endpoints:
 *
 *   POST /notifications
 *     Graph POSTs change notifications here. Two phases:
 *
 *     a) Validation handshake (one-time, on subscription create):
 *        Graph appends ?validationToken=<random> to the URL. We must reply
 *        200 with that token in the body (Content-Type: text/plain) within 10s.
 *
 *     b) Steady state: { value: [Notification...] } JSON body. We append each
 *        to the changeFeed and reply 202.
 *
 *     We also verify clientState if MSGO_RECEIVER_CLIENT_STATE is set —
 *     mismatched payloads are logged and dropped.
 *
 *   POST /lifecycle
 *     Same shape, but for lifecycle notifications (reauthorizationRequired,
 *     subscriptionRemoved, missed). We log these and append to the feed
 *     marked with lifecycleEvent.
 *
 *   GET /health
 *     Simple liveness: returns { ok, uptimeMs, feedSubs }.
 *
 * No external HTTP framework dependency — this uses node:http to keep the
 * plugin's footprint minimal. Add an HTTPS terminator (Caddy / nginx / Cloudflare)
 * in front in production.
 */
import { createServer } from "node:http";
import { URL } from "node:url";
import { recordNotification, listFeedSubscriptions } from "./changeFeed.js";
import { logger } from "../logger.js";
import { randomUUID } from "node:crypto";
const PORT = Number(process.env.MSGO_RECEIVER_PORT ?? 7878);
const EXPECTED_CLIENT_STATE = process.env.MSGO_RECEIVER_CLIENT_STATE; // optional shared secret
const startedAt = Date.now();
function readBody(req, maxBytes = 1_000_000) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on("data", (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                req.destroy();
                reject(new Error(`request body exceeds ${maxBytes} bytes`));
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        req.on("error", reject);
    });
}
async function handleNotifications(req, res, isLifecycle) {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    // (a) Validation handshake
    const validationToken = url.searchParams.get("validationToken");
    if (validationToken) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end(validationToken);
        logger.info({ validationToken: validationToken.slice(0, 8) + "..." }, "subscription validation handshake");
        return;
    }
    if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("method not allowed");
        return;
    }
    // (b) Steady-state notification
    let body;
    try {
        const raw = await readBody(req);
        body = raw ? JSON.parse(raw) : {};
    }
    catch (e) {
        res.statusCode = 400;
        res.end(e.message);
        return;
    }
    const items = body.value ?? [];
    let stored = 0;
    for (const n of items) {
        if (EXPECTED_CLIENT_STATE && n.clientState !== EXPECTED_CLIENT_STATE) {
            logger.warn({ sub: n.subscriptionId }, "clientState mismatch — dropping notification");
            continue;
        }
        const rec = {
            id: randomUUID(),
            receivedAt: new Date().toISOString(),
            subscriptionId: n.subscriptionId,
            subscriptionExpirationDateTime: n.subscriptionExpirationDateTime,
            changeType: n.changeType,
            clientState: n.clientState,
            resource: n.resource,
            resourceData: n.resourceData,
            encryptedContent: n.encryptedContent,
            tenantId: n.tenantId,
            ...(isLifecycle && n.lifecycleEvent ? { lifecycleEvent: n.lifecycleEvent } : {}),
        };
        recordNotification(rec);
        stored += 1;
    }
    // Always 202 Accepted — Graph retries if we don't ack within 30s.
    res.statusCode = 202;
    res.end(`stored ${stored}/${items.length}`);
    logger.info({ stored, total: items.length, isLifecycle }, "change notifications received");
}
function handleHealth(_req, res) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
        ok: true,
        uptimeMs: Date.now() - startedAt,
        feedSubs: listFeedSubscriptions().length,
        port: PORT,
        requireClientState: Boolean(EXPECTED_CLIENT_STATE),
    }));
}
const server = createServer(async (req, res) => {
    try {
        const path = (req.url ?? "/").split("?")[0];
        if (path === "/notifications")
            return handleNotifications(req, res, false);
        if (path === "/lifecycle")
            return handleNotifications(req, res, true);
        if (path === "/health")
            return handleHealth(req, res);
        res.statusCode = 404;
        res.end("not found");
    }
    catch (e) {
        logger.error({ err: e.message, stack: e.stack }, "receiver request failed");
        res.statusCode = 500;
        res.end("server error");
    }
});
server.listen(PORT, () => {
    logger.info({ port: PORT, requireClientState: Boolean(EXPECTED_CLIENT_STATE) }, "ms-graph-omni webhook receiver listening");
    // eslint-disable-next-line no-console
    console.log(`receiver: http://localhost:${PORT} (POST /notifications, POST /lifecycle, GET /health)`);
});
const shutdown = (signal) => {
    logger.info({ signal }, "receiver shutting down");
    server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
//# sourceMappingURL=webhookReceiver.js.map