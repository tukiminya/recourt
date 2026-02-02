import { createHash } from "node:crypto";

export const createSha256 = () => createHash("sha256");

export const hashBuffer = (buffer: ArrayBuffer | Buffer | Uint8Array) => {
  const hash = createSha256();
  const payload = Buffer.isBuffer(buffer)
    ? buffer
    : buffer instanceof Uint8Array
      ? Buffer.from(buffer)
      : Buffer.from(new Uint8Array(buffer));
  hash.update(payload);
  return `sha256:${hash.digest("hex")}`;
};
