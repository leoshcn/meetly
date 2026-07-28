import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import {
  meetingsAttachSource,
  meetingsCreate,
  meetingsCreateFromFile,
  meetingsDelete,
  meetingsGet,
  meetingsGetTranscript,
  meetingsList,
  meetingsRename,
  meetingsUpdateSpeakers,
} from "./meetings";

describe("meetings commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("meetingsCreate invokes meetings_create", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m0",
      source_path: "",
      title: "未命名项目",
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsCreate();
    expect(invoke).toHaveBeenCalledWith("meetings_create", undefined);
  });

  it("meetingsCreateFromFile passes path", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m1",
      source_path: "/a.wav",
      title: "a",
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsCreateFromFile("/a.wav");
    expect(invoke).toHaveBeenCalledWith("meetings_create_from_file", {
      path: "/a.wav",
    });
  });

  it("meetingsAttachSource passes meeting_id and path", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m1",
      source_path: "/a.wav",
      title: "a",
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsAttachSource("m1", "/a.wav");
    expect(invoke).toHaveBeenCalledWith("meetings_attach_source", {
      meeting_id: "m1",
      path: "/a.wav",
    });
  });

  it("meetingsList invokes meetings_list", async () => {
    const invoke = vi.fn().mockResolvedValue([]);
    __setInvokeForTests(invoke);
    await meetingsList();
    expect(invoke).toHaveBeenCalledWith("meetings_list", undefined);
  });

  it("meetingsGet passes meeting_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m1",
      source_path: "/a.wav",
      title: null,
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsGet("m1");
    expect(invoke).toHaveBeenCalledWith("meetings_get", { meeting_id: "m1" });
  });

  it("meetingsRename passes title", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m1",
      source_path: "/a.wav",
      title: "新标题",
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsRename("m1", "新标题");
    expect(invoke).toHaveBeenCalledWith("meetings_rename", {
      meeting_id: "m1",
      title: "新标题",
    });
  });

  it("meetingsDelete passes meeting_id", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    __setInvokeForTests(invoke);
    await meetingsDelete("m1");
    expect(invoke).toHaveBeenCalledWith("meetings_delete", {
      meeting_id: "m1",
    });
  });

  it("meetingsGetTranscript passes meeting_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      meeting_id: "m1",
      text: "hello",
      segments: [],
      speaker_names: {},
    });
    __setInvokeForTests(invoke);
    await meetingsGetTranscript("m1");
    expect(invoke).toHaveBeenCalledWith("meetings_get_transcript", {
      meeting_id: "m1",
    });
  });

  it("meetingsUpdateSpeakers passes map", async () => {
    const invoke = vi.fn().mockResolvedValue({
      meeting_id: "m1",
      text: "x",
      segments: [],
      speaker_names: { "1": "张三" },
    });
    __setInvokeForTests(invoke);
    await meetingsUpdateSpeakers("m1", { "1": "张三" });
    expect(invoke).toHaveBeenCalledWith("meetings_update_speakers", {
      meeting_id: "m1",
      speaker_names: { "1": "张三" },
    });
  });
});
