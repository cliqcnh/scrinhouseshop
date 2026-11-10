import { z } from "zod";

/**
 * A looser UUID check than zod's built-in `.uuid()`. Postgres's `uuid`
 * column type only enforces the 8-4-4-4-12 hex shape, not RFC 4122
 * version/variant bits — zod's `.uuid()` does enforce those bits and
 * rejects otherwise-valid Postgres UUIDs (e.g. deterministic seed IDs like
 * `10000000-0000-0000-0000-000000000001`). Use this wherever validating an
 * ID that came from (or is going to) the database.
 */
export function id(message = "Invalid ID") {
  return z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);
}
