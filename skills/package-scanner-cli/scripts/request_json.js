"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestJson = requestJson;
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const node_url_1 = require("node:url");
function requestJson(method, urlString, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new node_url_1.URL(urlString);
        const transport = url.protocol === "https:" ? node_https_1.default : node_http_1.default;
        const body = options.payload === undefined ? null : JSON.stringify(options.payload);
        const headers = { Accept: "application/json" };
        if (body !== null) {
            headers["Content-Type"] = "application/json";
            headers["Content-Length"] = Buffer.byteLength(body);
        }
        const req = transport.request(url, {
            method,
            headers,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
                chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            });
            res.on("end", () => {
                const rawBody = Buffer.concat(chunks).toString("utf8");
                const statusCode = res.statusCode ?? 0;
                if (statusCode < 200 || statusCode >= 300) {
                    reject(new Error(`HTTP ${statusCode}: ${rawBody || res.statusMessage || "Request failed"}`));
                    return;
                }
                if (!rawBody) {
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(rawBody));
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    reject(new Error(`Response was not valid JSON: ${message}`));
                }
            });
        });
        req.on("error", (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });
        req.setTimeout((options.timeout ?? 120) * 1000, () => {
            req.destroy(new Error("Request timed out"));
        });
        if (body !== null) {
            req.write(body);
        }
        req.end();
    });
}
