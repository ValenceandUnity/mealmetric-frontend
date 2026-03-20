import "server-only";

import crypto from "node:crypto";

type TrustedHeaderOptions = {
  method: string;
  pathWithQuery: string;
  body: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name}_missing`);
  }

  return value;
}

function buildSignatureInput({ method, pathWithQuery, body }: TrustedHeaderOptions) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const caller = getRequiredEnv("BFF_CALLER");
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const key = getRequiredEnv("BFF_KEY");

  const signature = crypto
    .createHmac("sha256", key)
    .update(`${method.toUpperCase()}\n${pathWithQuery}\n${timestamp}\n${caller}\n${bodyHash}`)
    .digest("hex");

  return { timestamp, caller, signature, key };
}

export function buildTrustedBackendHeaders(options: TrustedHeaderOptions): Headers {
  const { timestamp, caller, signature, key } = buildSignatureInput(options);
  const headers = new Headers();

  headers.set("X-MM-BFF-Key", key);
  headers.set("X-MM-BFF-Caller", caller);
  headers.set("X-MM-BFF-Timestamp", timestamp);
  headers.set("X-MM-BFF-Signature", signature);

  return headers;
}