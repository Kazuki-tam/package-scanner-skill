"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUrl = buildUrl;
const node_url_1 = require("node:url");
function buildUrl(baseUrl, pathname, query) {
    const url = new node_url_1.URL(pathname.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (query) {
        const params = new node_url_1.URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== "") {
                params.set(key, value);
            }
        }
        url.search = params.toString();
    }
    return url.toString();
}
