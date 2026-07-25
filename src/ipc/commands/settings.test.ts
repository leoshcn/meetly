import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import {
  settingsClearDashscopeCredentials,
  settingsClearDoubaoCredentials,
  settingsGet,
  settingsUpdate,
} from "./settings";

describe("settings commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("settingsGet invokes settings_get", async () => {
    const invoke = vi.fn().mockResolvedValue({
      hotwords: ["Meetly"],
      context_text: "",
      doubao_configured: false,
      dashscope_configured: false,
    });
    __setInvokeForTests(invoke);

    const result = await settingsGet();
    expect(invoke).toHaveBeenCalledWith("settings_get", undefined);
    expect(result.hotwords).toEqual(["Meetly"]);
    expect(result.doubao_configured).toBe(false);
    expect(result.dashscope_configured).toBe(false);
  });

  it("settingsUpdate passes SettingsUpdate payload", async () => {
    const invoke = vi.fn().mockResolvedValue({
      hotwords: ["Meetly"],
      context_text: "ctx",
      doubao_configured: true,
      dashscope_configured: true,
    });
    __setInvokeForTests(invoke);

    await settingsUpdate({
      hotwords: ["Meetly"],
      context_text: "ctx",
      doubao_app_id: "app",
      doubao_access_token: "token",
      dashscope_api_key: "sk-test",
    });
    expect(invoke).toHaveBeenCalledWith("settings_update", {
      update: {
        hotwords: ["Meetly"],
        context_text: "ctx",
        doubao_app_id: "app",
        doubao_access_token: "token",
        dashscope_api_key: "sk-test",
      },
    });
  });

  it("settingsClearDoubaoCredentials invokes clear command", async () => {
    const invoke = vi.fn().mockResolvedValue({
      hotwords: [],
      context_text: "",
      doubao_configured: false,
      dashscope_configured: false,
    });
    __setInvokeForTests(invoke);
    await settingsClearDoubaoCredentials();
    expect(invoke).toHaveBeenCalledWith(
      "settings_clear_doubao_credentials",
      undefined,
    );
  });

  it("settingsClearDashscopeCredentials invokes clear command", async () => {
    const invoke = vi.fn().mockResolvedValue({
      hotwords: [],
      context_text: "",
      doubao_configured: false,
      dashscope_configured: false,
    });
    __setInvokeForTests(invoke);
    await settingsClearDashscopeCredentials();
    expect(invoke).toHaveBeenCalledWith(
      "settings_clear_dashscope_credentials",
      undefined,
    );
  });
});
