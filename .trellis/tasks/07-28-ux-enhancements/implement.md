# Implement: 用户体验增强

## Checklist

1. **ConfirmDialog** → `shared/ui` + 导出；核对 Esc/遮罩/danger/focus/motion  
2. **侧边栏** → Confirm 删除；IconButton；去选中常显；空态引导  
3. **凭证** → Clear Confirm；掩码 UX；用户向 hint；去「留空不改」  
4. **设置 Tab 壳** → 三 Tab；页头文案；hotwords/recording/ffmpeg hint + 热词中文错误  
5. **工作区布局** → 宽屏强化分栏高度约束；窄屏 Tab；D11 默认 + 转写结束切摘要  
6. **验证** → `npm run typecheck` && `npm test` + 手测清单  

## Validation

```bash
npm run typecheck
npm test
```

手测：删项目；清凭证；掩码编辑；设置 Tab；宽屏长转写摘要仍可见；窄屏 Tab 与默认/转写结束切换。

## Risky files

| 文件 | 风险 |
|------|------|
| `HomePage.tsx` / `.module.css` | 断点切换、高度链、默认 tab |
| `MeetingSidebar.*` | 可达性、误删 |
| `SettingsCredentials.tsx` | 掩码 vs 保存门控 |
| `ConfirmDialog.*` | 焦点逃逸 |

## Before `task.py start`

- [x] prd / design / implement 收敛；无 blocking open questions  
- [x] implement.jsonl / check.jsonl 已有真实条目（若增工作区设计，可再 `add-context`）  
- [ ] **用户批准本最终规划摘要**后再 `task.py start`  
