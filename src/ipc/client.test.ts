import { describe, expect, it } from "vitest";
import { normalizeError } from "./client";

describe("normalizeError", () => {
  it("preserves code and message from AppError-shaped payload", () => {
    const err = normalizeError({
      code: "SETTINGS_INVALID",
      message: "Hotwords cannot be empty",
      details: { field: "hotwords", index: 0 },
    });
    expect(err).toEqual({
      code: "SETTINGS_INVALID",
      message: "Hotwords cannot be empty",
      details: { field: "hotwords", index: 0 },
    });
  });

  it("maps string rejects to INTERNAL", () => {
    expect(normalizeError("boom")).toEqual({
      code: "INTERNAL",
      message: "Unexpected error",
    });
  });

  it("maps unknown objects to INTERNAL", () => {
    expect(normalizeError({ foo: 1 })).toEqual({
      code: "INTERNAL",
      message: "Unexpected error",
    });
  });

  it("parses AppError JSON embedded in message", () => {
    const err = normalizeError({
      message: JSON.stringify({
        code: "DB_ERROR",
        message: "Database error",
      }),
    });
    expect(err.code).toBe("DB_ERROR");
    expect(err.message).toBe("Database error");
  });
});
