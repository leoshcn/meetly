import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import {
  settingsClearDashscopeCredentials,
  settingsClearDoubaoCredentials,
  settingsClearTosCredentials,
  settingsGet,
  settingsUpdate,
} from "./settings";

const emptySettings = {
  hotwords: [] as string[],
  context_text: "",
  doubao_configured: false,
  dashscope_configured: false,
  tos_configured: false,
  tos_region: "",
  tos_bucket: "",
  tos_endpoint: "",
  recording_dir: "",
  recording_dir_resolved: "C:\\Users\\test\\Documents\\Meetly\\Recordings",
};

describe("settings commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("settingsGet invokes settings_get", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ...emptySettings,
      hotwords: ["Meetly"],
    });
    __setInvokeForTests(invoke);

    const result = await settingsGet();
    expect(invoke).toHaveBeenCalledWith("settings_get", undefined);
    expect(result.hotwords).toEqual(["Meetly"]);
    expect(result.doubao_configured).toBe(false);
    expect(result.dashscope_configured).toBe(false);
    expect(result.tos_configured).toBe(false);
  });

  it("settingsUpdate passes SettingsUpdate payload", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ...emptySettings,
      hotwords: ["Meetly"],
      context_text: "ctx",
      doubao_configured: true,
      dashscope_configured: true,
      tos_configured: true,
      tos_region: "cn-beijing",
      tos_bucket: "meetly",
    });
    __setInvokeForTests(invoke);

    await settingsUpdate({
      hotwords: ["Meetly"],
      context_text: "ctx",
      doubao_app_id: "app",
      doubao_access_token: "token",
      dashscope_api_key: "sk-test",
      tos_access_key_id: "ak",
      tos_secret_access_key: "sk",
      tos_region: "cn-beijing",
      tos_bucket: "meetly",
    });
    expect(invoke).toHaveBeenCalledWith("settings_update", {
      update: {
        hotwords: ["Meetly"],
        context_text: "ctx",
        doubao_app_id: "app",
        doubao_access_token: "token",
        dashscope_api_key: "sk-test",
        tos_access_key_id: "ak",
        tos_secret_access_key: "sk",
        tos_region: "cn-beijing",
        tos_bucket: "meetly",
      },
    });
  });

  it("settingsClearDoubaoCredentials invokes clear command", async () => {
    const invoke = vi.fn().mockResolvedValue(emptySettings);
    __setInvokeForTests(invoke);
    await settingsClearDoubaoCredentials();
    expect(invoke).toHaveBeenCalledWith(
      "settings_clear_doubao_credentials",
      undefined,
    );
  });

  it("settingsClearDashscopeCredentials invokes clear command", async () => {
    const invoke = vi.fn().mockResolvedValue(emptySettings);
    __setInvokeForTests(invoke);
    await settingsClearDashscopeCredentials();
    expect(invoke).toHaveBeenCalledWith(
      "settings_clear_dashscope_credentials",
      undefined,
    );
  });

  it("settingsClearTosCredentials invokes clear command", async () => {
    const invoke = vi.fn().mockResolvedValue(emptySettings);
    __setInvokeForTests(invoke);
    await settingsClearTosCredentials();
    expect(invoke).toHaveBeenCalledWith(
      "settings_clear_tos_credentials",
      undefined,
    );
  });
});
