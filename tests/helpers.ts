import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

export async function createTempFile(contents: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "package-scanner-test-"));
  const filePath = path.join(directory, "fixture.txt");
  await writeFile(filePath, contents, "utf8");
  return filePath;
}

export async function removeTempFile(filePath: string): Promise<void> {
  await rm(path.dirname(filePath), { recursive: true, force: true });
}

export async function withHttpServer(
  handler: http.RequestListener,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to obtain test server address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}
