"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readText = readText;
const node_fs_1 = __importDefault(require("node:fs"));
function readText(filePath) {
    return node_fs_1.default.readFileSync(filePath, "utf8");
}
