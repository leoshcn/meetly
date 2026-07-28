import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import {
  settingsClearDashscopeCredentials,
  settingsClearDoubaoCredentials,
  settingsClearTosCredentials,
  settingsGet,
  settingsTestDashscope,
  settingsTestDoubao,
  settingsTestTos,
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
  theme_preference: "system" as const,
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

  it("settingsTestDoubao passes optional overrides", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    __setInvokeForTests(invoke);
    await settingsTestDoubao({ doubao_app_id: "app", doubao_access_token: "tok" });
    expect(invoke).toHaveBeenCalledWith("settings_test_doubao", {
      doubao_app_id: "app",
      doubao_access_token: "tok",
    });
  });

  it("settingsTestDoubao allows empty overrides", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    __setInvokeForTests(invoke);
    await settingsTestDoubao();
    expect(invoke).toHaveBeenCalledWith("settings_test_doubao", {
      doubao_app_id: undefined,
      doubao_access_token: undefined,
    });
  });

  it("settingsTestTos passes optional overrides", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    __setInvokeForTests(invoke);
    await settingsTestTos({
      tos_access_key_id: "ak",
      tos_region: "cn-beijing",
      tos_bucket: "b",
    });
    expect(invoke).toHaveBeenCalledWith("settings_test_tos", {
      tos_access_key_id: "ak",
      tos_secret_access_key: undefined,
      tos_region: "cn-beijing",
      tos_bucket: "b",
      tos_endpoint: undefined,
    });
  });

  it("settingsTestDashscope passes optional override", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    __setInvokeForTests(invoke);
    await settingsTestDashscope({ dashscope_api_key: "sk-x" });
    expect(invoke).toHaveBeenCalledWith("settings_test_dashscope", {
      dashscope_api_key: "sk-x",
    });
  });
});
