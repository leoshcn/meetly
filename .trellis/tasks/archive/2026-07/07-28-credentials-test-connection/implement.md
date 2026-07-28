# Implement: 凭证测试连接

## Checklist

1. **Backend probes**
   - [ ] TOS：`head_bucket` + 短超时 client builder
   - [ ] DashScope：`GET /models` helper
   - [ ] Doubao：内置探针音频 + flash 调用；认证失败 vs 空结果判定
2. **Merge + commands**
   - [ ] `settings_test_doubao|tos|dashscope` + 注册 `lib.rs`
   - [ ] 合并 override / keyring / sqlite；不写盘
   - [ ] Rust 单测：未配置、合并缺字段
3. **Frontend IPC**
   - [ ] types + `settings.ts` wrappers + Vitest
   - [ ] 导出 `ipc/index`
4. **SettingsCredentials UI**
   - [ ] 三块「测试连接」；组装 override（跳过掩码）；内联状态
   - [ ] 不完整时 disabled
5. **Spec**
   - [ ] 更新 `api-shape.md`
6. **Verify**
   - [ ] `npm run typecheck` && `npm test`
   - [ ] `cargo test`（相关）

## Validation

```bash
npm run typecheck
npm test
cd src-tauri && cargo test
```

手测：已保存成功；改一字段未保存仍测新组合；错密钥失败；成功后不保存再进设置仍旧配置。

## Before start

- [x] prd / design / implement
- [ ] 用户批准最终规划摘要
- [ ] 批准后 curated jsonl → `task.py start`
