# Design: 凭证测试连接

## Architecture

```
UI SettingsCredentials
  → ipc settings_test_* (optional overrides, write-only)
    → settings service: merge(overrides, keyring/sqlite)
      → provider probe (flash / head_bucket / models GET)
        → Ok(()) | AppErrorDto
```

不落盘。无新表。

## IPC contracts

### `settings_test_doubao`

Request (all optional strings; empty/omit = use saved):

```ts
{ doubao_app_id?: string; doubao_access_token?: string }
```

Response: `{ ok: true }`  
Errors: `ASR_NOT_CONFIGURED` / `SETTINGS_INVALID` / ASR auth or network mapped message.

### `settings_test_tos`

```ts
{
  tos_access_key_id?: string;
  tos_secret_access_key?: string;
  tos_region?: string;
  tos_bucket?: string;
  tos_endpoint?: string;
}
```

Merge: secrets from override or keyring; region/bucket/endpoint from override if non-empty else SQLite.  
Probe: `HeadBucket` on merged bucket.  
Errors: not configured / TOS failure (sanitized, no URL/secret in message).

### `settings_test_dashscope`

```ts
{ dashscope_api_key?: string }
```

Probe: `GET https://dashscope.aliyuncs.com/compatible-mode/v1/models` with `Authorization: Bearer …`.  
2xx → ok；401/403 → 明确失败；其它 → 网络/服务错误文案。

## Merge rules（后端权威）

对每个密钥字段：`override` 若 `Some` 且 trim 非空 → 用 override；否则用 keyring。  
TOS 非密钥：override trim 非空 → 用 override；否则 SQLite。  
缺任一侧必填 → `SETTINGS_INVALID` 或既有 `*_NOT_CONFIGURED`。

前端不得把掩码常量当作 override 上传。

## Doubao probe

- Runtime-built **16 kHz mono 16-bit PCM WAV ≥1.1s** (quiet tone) + flash client.
- 勿用 8 kHz / 亚秒静音：会触发 `45000000` / `11103 audio convert failed`。
- 判定：`20000000`（识别成功）或 `20000003`（无有效语音/静音，但鉴权已通过）→ **Ok**；其它（含认证失败、convert failed）→ Err。
- 正式转写路径仍仅接受 `20000000`，不受探针放宽影响。

## TOS probe

- 在 `HttpTosClient`（或旁路函数）调用 SDK `head_bucket`；短超时（如 connection 15–30s，request 不宜 30min 上传超时——测试用单独 builder 短 timeout）。

## UI

| 状态 | UI |
|------|-----|
| idle | 「测试连接」secondary；完整可测时 enabled |
| testing | 「测试中…」disabled |
| ok | 「连接正常」（可与已更新 hint 同区，互斥显示） |
| err | 该块 error 行 |

每块独立 status，互不阻塞其它块测试（可选共享 global saving 锁——推荐**不**共用 credentials 的 save busy，测试与保存可分别禁用本块按钮）。

## Spec updates

- `.trellis/spec/backend/api-shape.md` 登记三命令。

## Trade-offs

| 选择 | 取舍 |
|------|------|
| 表单优先 + 合并 | 密钥进 IPC 请求体（本机）但不落盘 |
| HeadBucket | SDK 已有；无对象垃圾 |
| models GET | 比 chat 便宜；若区域端点不同需后续兼容 |
| flash 探针 | 可能微量计费 |

## Rollback

删除三命令与 UI 按钮即可；无迁移。
