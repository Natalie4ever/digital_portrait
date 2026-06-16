# Step 5 测试用例 — 集成测试 + 回归测试 + 权限专项

> **测试角色：** 管理员 / 组长 / 普通员工
> **测试目的：** 验证 M1-M7 核心模块无回归、Step 1-4 新功能联调通畅、权限边界严格生效
> **预计耗时：** 2 人天
> **前置依赖：** Step 1-4 全部通过

---

## 一、测试总览

### 1.1 测试范围

| 测试类型 | 用例数 | 测试方式 | 工时 |
|---------|-------|---------|------|
| **M1 登录回归** | 8 | 接口 + 文档 | 1.0h |
| **M2 我的档案回归** | 10 | 接口 | 1.5h |
| **M3 档案管理回归** | 6 | 接口 | 1.0h |
| **M4 用户管理回归** | 8 | 接口 | 1.0h |
| **M5 操作日志回归** | 4 | 接口 | 0.5h |
| **M6 技能标签回归** | 4 | 接口 | 0.5h |
| **M7 家访记录回归** | 10 | 接口 | 1.5h |
| **Step 1 联调** | 5 | 接口 | 0.5h |
| **Step 2 联调** | 6 | 接口 | 0.5h |
| **Step 3 联调** | 5 | 接口 | 0.5h |
| **Step 4 联调** | 5 | 接口 | 0.5h |
| **权限专项（交叉矩阵）** | 20 | 接口 | 2.0h |
| **总计** | **91** | — | **12h ≈ 2 人天** |

### 1.2 测试账号

| 角色 | EHR号 | 密码 | 组别 | 用途 |
|------|-------|------|------|------|
| 管理员 | 0000001 | 1234567 | 管理组 | 全权限 |
| 组长 | 1234569 | 1234567 | 测试组 | 本组权限 |
| 组长 B | 2345678 | 1234567 | 测试二组 | 跨组越权测试 |
| 普通员工 | 0000002 | 1234567 | 任意组 | 自档案编辑 |
| 普通员工 B | 2345679 | 1234567 | 测试二组 | 跨组测试对象 |

> 注：以上账号为默认种子数据，如数据库已重置请先用 admin 批量导入。

---

## 二、M1 登录模块回归

### 🟢 M1-T1：EHR 号格式校验
**操作：** `GET /api/auth/check-ehr/12345`（5 位）
**预期：** `400 {"detail": "EHR号必须是7位数字"}`

### 🟢 M1-T2：EHR 号不存在
**操作：** `GET /api/auth/check-ehr/0000999`
**预期：** `404 {"detail": "EHR号不存在"}`

### 🟢 M1-T3：EHR 号存在
**操作：** `GET /api/auth/check-ehr/0000001`
**预期：** `200 {"exists": true, "name": "..."}`

### 🟢 M1-T4：密码错误
**操作：** `POST /api/auth/login` body=`{ehr_no: "0000001", password: "wrong"}`
**预期：** `401 {"detail": "EHR号或密码错误"}`

### 🟢 M1-T5：登录成功 + 返回 token
**操作：** 正确 EHR + 密码
**预期：** `200 {access_token, expire_minutes: 60}`

### 🟢 M1-T6：禁用账号拒绝
**操作：** admin 把某员工 `is_disabled=true` → 该员工登录
**预期：** `403 {"detail": "账号已禁用"}`

### 🟢 M1-T7：未提供 token 访问受保护接口
**操作：** `GET /api/profile/me` 无 Header
**预期：** `401 {"detail": "未提供认证信息"}`

### 🟢 M1-T8：无效 token 访问
**操作：** `GET /api/profile/me` Header=`Bearer invalid_token`
**预期：** `401 {"detail": "登录已过期或无效，请重新登录"}`

### 🟢 M1-T9：修改密码
**操作：** `POST /api/auth/change-password {old, new}` → 用新密码登录
**预期：** 改后能登录，旧密码 400

### 🟢 M1-T10：登录日志落库
**操作：** 登录后查询 `GET /api/admin/operation-logs?action=login`
**预期：** 出现该用户最近一条 login 记录

---

## 三、M2 我的档案回归

### 🟢 M2-T1：读取自己完整档案
**操作：** `GET /api/profile/me`
**预期：** `200`，含 base / political / education / family / resume / reward / qualification / achievement / language / contact / skill_tags / development_intent / project_summaries

### 🟢 M2-T2：编辑基础信息（通讯）
**操作：** `PUT /api/profile/me/contact` 修改电话
**预期：** `200`，再次读取字段已更新

### 🟢 M2-T3：政治面貌 增/改/删
**操作：** `POST /me/political` → `PUT /me/political/{id}` → `DELETE /me/political/{id}`
**预期：** 三步均 200/204

### 🟢 M2-T4：学历学位 增/改/删
**操作：** 同上
**预期：** 三步均 200/204

### 🟢 M2-T5：家属信息 增/改/删
**操作：** 同上
**预期：** 三步均 200/204

### 🟢 M2-T6：简历 增/改/删
**操作：** 同上
**预期：** 三步均 200/204

### 🟢 M2-T7：奖惩信息 增/改/删
**操作：** 同上
**预期：** 三步均 200/204

### 🟢 M2-T8：外部资格（含 valid_until） 增/改/删
**操作：** 新增资格 `valid_until=2026-12-31`
**预期：** 列表返回该字段，可编辑

### 🟢 M2-T9：专业成果 增/改/删
**操作：** 同上
**预期：** 三步均 200/204

### 🟢 M2-T10：语言能力 增/改/删
**操作：** 同上
**预期：** 三步均 200/204

### 🟢 M2-T11：技能标签 增/删
**操作：** `POST /me/skill-tags {tag_name: "Java"}` → `DELETE /me/skill-tags/{id}`
**预期：** 200/200

---

## 四、M3 档案管理回归（管理员/组长）

### 🟢 M3-T1：管理员查看他人档案
**操作：** `GET /api/profile/by-ehr/0000002`（admin）
**预期：** `200`，完整档案

### 🟢 M3-T2：管理员档案列表 + 多条件筛选
**操作：** `GET /api/profile/admin/list?group_name=测试组&is_emergency_staff=true`
**预期：** `200`，列表符合条件

### 🟢 M3-T3：组长仅看本组
**操作：** 组长（测试组）→ `GET /api/profile/admin/list`
**预期：** 列表全员 `group_name=测试组`

### 🟢 M3-T4：组长访问他组成员档案
**操作：** 组长访问 `by-ehr/{本组成员}`
**预期：** `200`

### 🟢 M3-T5：组长访问他组成员档案
**操作：** 测试组组长访问 `by-ehr/{测试二组成员}`
**预期：** `403`

### 🟢 M3-T6：toggle-emergency（admin）
**操作：** admin 切换某员工 → 再次切换
**预期：** 两次返回的 `is_emergency_staff` 互为反

---

## 五、M4 用户管理回归

### 🟢 M4-T1：用户列表 + 分页
**操作：** `GET /api/admin/users?page=1&page_size=10`
**预期：** `200 {total, items}`

### 🟢 M4-T2：用户筛选
**操作：** `?role=leader` / `?is_emergency_staff=true` / `?group_name=测试组`
**预期：** 列表内容与条件匹配

### 🟢 M4-T3：创建用户
**操作：** `POST /api/admin/users {ehr_no, name, group_name, role, initial_password}`
**预期：** `200`，新建用户可登录

### 🟢 M4-T4：EHR 已存在拒绝
**操作：** 再次创建相同 EHR
**预期：** `400 {"detail": "EHR号已存在"}`

### 🟢 M4-T5：编辑用户（角色/姓名/启用）
**操作：** `PUT /api/admin/users/{ehr_no}`
**预期：** `200`，字段更新

### 🟢 M4-T6：编辑用户（跨组 → 写入调组历史）
**操作：** admin 把 A 从组 X 改到组 Y
**预期：** `200`，且 `group_transfer_history` 增加一条 `transfer_user` 记录

### 🟢 M4-T7：重置密码
**操作：** `POST /api/admin/users/reset-password {ehr_no, new_password}`
**预期：** `200`，新密码可登录

### 🟢 M4-T8：软删除
**操作：** `DELETE /api/admin/users/{ehr_no}`
**预期：** `200 {"message": "已删除（软删除）"}`，再查询返回 404

---

## 六、M5 操作日志回归

### 🟢 M5-T1：日志落库
**操作：** 任一写操作后查 `GET /api/admin/operation-logs`
**预期：** 出现对应 action（如 `create_user`、`toggle_emergency_staff`、`transfer_user`）

### 🟢 M5-T2：按 user_id 筛选
**操作：** `?user_id=1`
**预期：** 仅返回该用户的日志

### 🟢 M5-T3：按 action 筛选（模糊）
**操作：** `?action=transfer`
**预期：** 包含 transfer_user 记录

### 🟢 M5-T4：普通员工无权限
**操作：** 普通员工调用 `/api/admin/operation-logs`
**预期：** `403`

---

## 七、M6 技能标签回归

### 🟢 M6-T1：列出模板
**操作：** `GET /api/skill-tags/templates`
**预期：** `200`，返回标签数组

### 🟢 M6-T2：创建模板（admin）
**操作：** `POST /api/skill-tags/templates {name: "Python"}`
**预期：** `200`，再查模板有该标签

### 🟢 M6-T3：重复创建拒绝
**操作：** 同名再创建
**预期：** `400 {"detail": "该标签已存在"}`

### 🟢 M6-T4：删除模板（admin）
**操作：** `DELETE /api/skill-tags/templates/{id}`
**预期：** `200`，模板消失

### 🟢 M6-T5：普通员工创建模板被拒
**操作：** 普通员工调用 `POST /api/skill-tags/templates`
**预期：** `403`

---

## 八、M7 家访记录回归

### 🟢 M7-T1：组长列表（本组）
**操作：** 组长调用 `GET /api/home-visits`
**预期：** 仅返回本组成员被家访记录

### 🟢 M7-T2：普通员工列表（仅自己）
**操作：** 普通员工调用 `GET /api/home-visits`
**预期：** 仅返回自己被家访记录

### 🟢 M7-T3：管理员列表（全员）
**操作：** admin 调用 `GET /api/home-visits`
**预期：** 返回所有家访

### 🟢 M7-T4：组长新建家访（本组成员）
**操作：** `POST /api/home-visits {visited_ehr_no: 本组成员}`
**预期：** `201`，记录创建成功

### 🟢 M7-T5：组长新建家访（他组成员）
**操作：** 组长对非本组成员提交
**预期：** `403 {"detail": "只能对本组成员进行家访"}`

### 🟢 M7-T6：普通员工新建家访被拒
**操作：** 普通员工提交
**预期：** `403 {"detail": "仅组长可新建家访记录"}`

### 🟢 M7-T7：组长编辑家访
**操作：** `PUT /api/home-visits/{id}`
**预期：** `200`，字段更新

### 🟢 M7-T8：管理员不可编辑家访
**操作：** admin 调 `PUT /api/home-visits/{id}`
**预期：** `403 {"detail": "仅组长可编辑家访记录，管理员不可编辑"}`

### 🟢 M7-T9：管理员删除家访
**操作：** admin 调 `DELETE /api/home-visits/{id}`
**预期：** `204`

### 🟢 M7-T10：家访记录按 year/method 筛选
**操作：** `?visit_year=2026&visit_method=实地走访`
**预期：** 列表内容符合筛选

### 🟢 M7-T11（关键）：调组后家访历史保留
**操作：** 组长对 A 做家访 → 管理员把 A 调到其他组 → 原组长查家访列表
**预期：** 历史家访记录**仍可见**（不丢失），但**不可新建** A 的家访（因为 A 不在本组）

---

## 九、Step 1 联调（基础字段）

### 🟢 S1-INT-1：应急先锋队全链路
**操作：** 员工本人 `is_emergency_staff=true` → admin 在用户管理再次切换 → 列表筛选 → 场景筛选
**预期：** 4 个接口同步返回一致状态

### 🟢 S1-INT-2：证书有效期 + 列表渲染
**操作：** 新增证书（含 valid_until） → 列表 → 导出（如果有）
**预期：** valid_until 字段持久化

### 🟢 S1-INT-3：发展意向 1:1 四段保存
**操作：** `PUT /me/development-intent` 提交 4 段内容 → `GET` 验证
**预期：** 字段完整一致

### 🟢 S1-INT-4：项目总结 + 技能标签关联
**操作：** `POST /me/project-summary` 关联 tag → `GET` 返回 tags
**预期：** 关联关系保留

### 🟢 S1-INT-5：toggle-emergency 操作日志
**操作：** 切换应急先锋队 → 查日志 `?action=toggle_emergency_staff`
**预期：** 至少 1 条新日志

---

## 十、Step 2 联调（组员调换）

### 🟢 S2-INT-1：调组 + 历史
**操作：** 调 A 到新组 → 查历史 → 列表
**预期：** 历史 ≥ 2 条（初始入组 + 调组）

### 🟢 S2-INT-2：调组后 users.group_name 同步
**操作：** 调组后 `GET /admin/users` 查 A
**预期：** `group_name` 已更新

### 🟢 S2-INT-3：调组后原组长越权（关键）
**操作：** A 调离后，原组长访问 A 档案
**预期：** `403` 或 空内容

### 🟢 S2-INT-4：调组后新组长可看
**操作：** 新组长访问 A
**预期：** `200`

### 🟢 S2-INT-5：调组历史 + 操作日志
**操作：** 调组后查 `?action=transfer_user`
**预期：** 出现新调组记录，detail 含「旧组 → 新组」

### 🟢 S2-INT-6：重复调组保护
**操作：** 调到当前所在组
**预期：** `400`

---

## 十一、Step 3 联调（智能筛选）

### 🟢 S3-INT-1：应急响应 + Excel 导出
**操作：** `POST /scenarios/search {scenario: emergency}` → `POST /scenarios/export {scenario: emergency}`
**预期：** 列表数据完整；导出 `.xlsx` 大小 > 100 字节

### 🟢 S3-INT-2：活动选人 OR 匹配
**操作：** `interest_tags=["舞蹈","主持"]`
**预期：** 列表含任一标签员工，匹配度 = 命中数 × 20

### 🟢 S3-INT-3：项目组队多维评分
**操作：** `required_skill_tags=["Python"], min_cert_count=1, min_project_count=1`
**预期：** 匹配度 = 60 + 20 + 20 = 100

### 🟢 S3-INT-4：人员调配排除目标组
**操作：** `target_group="某组"`
**预期：** 结果 `group_name != 某组`

### 🟢 S3-INT-5：未知场景拒绝
**操作：** `scenario="unknown"`
**预期：** `422`

---

## 十二、Step 4 联调（团队能力分析）

### 🟢 S4-INT-1：overview 三段数据
**操作：** `POST /analytics/overview`
**预期：** 含 `total_employees / groups / skills`，且 ≥ 1

### 🟢 S4-INT-2：certificates 统计
**操作：** `POST /analytics/certificates`
**预期：** `total_certs ≥ 0`，`items` 按数量倒序

### 🟢 S4-INT-3：risks 等级数对齐
**操作：** `POST /analytics/risks`
**预期：** `red_count + yellow_count + green_count == len(items)`

### 🟢 S4-INT-4：emergency 通勤分布
**操作：** `POST /analytics/emergency`
**预期：** `items` 含 4 个 bucket（<30 / 30-60 / >60 / 未设置）

### 🟢 S4-INT-5：综合导出 Excel
**操作：** `POST /analytics/export`
**预期：** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，大小 > 1KB

---

## 十三、权限专项（角色 × 操作 交叉矩阵）

> **角色：** A=管理员 / L=组长 / U=普通员工
> **预期：** ✅=允许 / ❌=拒绝

### 13.1 写操作矩阵

| 接口 | A | L | U | 测试点 |
|------|---|---|---|--------|
| `POST /admin/users`（创建用户） | ✅ | ❌ | ❌ | T-PERM-1 |
| `DELETE /admin/users/{ehr}` | ✅ | ❌ | ❌ | T-PERM-2 |
| `POST /admin/users/reset-password` | ✅ | ❌ | ❌ | T-PERM-3 |
| `POST /admin/users/{ehr}/toggle-emergency` | ✅ | ❌ | ❌ | T-PERM-4 |
| `POST /admin/group-transfers/transfer` | ✅ | ❌ | ❌ | T-PERM-5 |
| `PUT /api/profile/by-ehr/{ehr}/base` | ✅ | ⚠️ | ❌ | T-PERM-6 |
| `POST /me/political`（自己的） | ✅ | ✅ | ✅ | T-PERM-7 |
| `POST /home-visits`（新建家访） | ❌ | ✅ | ❌ | T-PERM-8 |
| `PUT /home-visits/{id}` | ❌ | ✅ | ❌ | T-PERM-9 |
| `DELETE /home-visits/{id}` | ✅ | ✅ | ❌ | T-PERM-10 |
| `POST /skill-tags/templates` | ✅ | ❌ | ❌ | T-PERM-11 |

### 13.2 读操作矩阵

| 接口 | A | L | U | 测试点 |
|------|---|---|---|--------|
| `GET /admin/users` | ✅ 全员 | ❌ | ❌ | T-PERM-12 |
| `GET /profile/admin/list` | ✅ 全员 | ✅ 本组 | ❌ | T-PERM-13 |
| `GET /profile/by-ehr/{ehr}` | ✅ 任意 | ✅ 本组/自己 | ✅ 仅自己 | T-PERM-14 |
| `GET /home-visits` | ✅ 全员 | ✅ 本组 | ✅ 仅自己 | T-PERM-15 |
| `GET /admin/operation-logs` | ✅ | ❌ | ❌ | T-PERM-16 |
| `GET /admin/analytics/*` | ✅ 全员 | ✅ 本组 | ❌ | T-PERM-17 |
| `GET /admin/scenarios/*` | ✅ 全员 | ✅ 本组 | ❌ | T-PERM-18 |
| `GET /admin/group-transfers/*` | ✅ | ❌ | ❌ | T-PERM-19 |
| `GET /skill-tags/templates` | ✅ | ✅ | ✅ | T-PERM-20 |

### 13.3 关键权限场景

| 编号 | 场景 | 操作 | 预期 |
|------|------|------|------|
| T-PERM-21 | 组长 A 调组后看原组员 | 调离后 `GET /by-ehr/{原组成员}` | 403 |
| T-PERM-22 | 组长访问其他组档案 | `GET /by-ehr/{他组成员}` | 403 |
| T-PERM-23 | 普通员工访问 admin 接口 | `GET /admin/users` | 403 |
| T-PERM-24 | 普通员工访问他人档案 | `GET /by-ehr/{他人}` | 403 |
| T-PERM-25 | 普通员工编辑他人基础信息 | `PUT /by-ehr/{他人}/base` | 403 |
| T-PERM-26 | 失效 token 跨角色 | 用过期 token | 401 |
| T-PERM-27 | 软删除用户登录 | 已删除 EHR 登录 | 401 |
| T-PERM-28 | 组长无组别时访问 | `group_name=""` 的组长调家访 | 403 |

---

## 十四、性能与稳定性

| # | 测试点 | 操作 | 预期 |
|---|-------|------|------|
| PERF-1 | 列表分页 100 条响应 | `GET /admin/users?page_size=100` | < 2s |
| PERF-2 | 并发 5 个查询 | 5 个请求并发 | 无 5xx |
| PERF-3 | 长时间不操作 | 等待 60 分钟 | token 失效，需重新登录 |

---

## 十五、测试结果记录

| 模块 | 用例数 | 通过 | 失败 | 阻塞 |
|------|-------|------|------|------|
| M1 登录 | 10 | ⬜ | ⬜ | ⬜ |
| M2 我的档案 | 11 | ⬜ | ⬜ | ⬜ |
| M3 档案管理 | 6 | ⬜ | ⬜ | ⬜ |
| M4 用户管理 | 8 | ⬜ | ⬜ | ⬜ |
| M5 操作日志 | 4 | ⬜ | ⬜ | ⬜ |
| M6 技能标签 | 5 | ⬜ | ⬜ | ⬜ |
| M7 家访记录 | 11 | ⬜ | ⬜ | ⬜ |
| Step 1 联调 | 5 | ⬜ | ⬜ | ⬜ |
| Step 2 联调 | 6 | ⬜ | ⬜ | ⬜ |
| Step 3 联调 | 5 | ⬜ | ⬜ | ⬜ |
| Step 4 联调 | 5 | ⬜ | ⬜ | ⬜ |
| 权限专项 | 28 | ⬜ | ⬜ | ⬜ |
| 性能稳定性 | 3 | ⬜ | ⬜ | ⬜ |
| **合计** | **107** | ⬜ | ⬜ | ⬜ |

**通过条件：** 全部 ✅，**0 个红色**（红色用例必须在 Step 5 修复）

---

## 十六、冒烟测试（自动化）

```bash
cd backend
python smoke_test_step5.py
```

预期：**全部通过**（90+ 用例自动覆盖）

---

## 十七、风险与注意事项

| 现象 | 原因 | 排查 |
|------|------|------|
| Step 1-4 任一 case 失败 | 上一步未稳定 | 先回退到对应 Step 修复 |
| 权限 T-PERM-22 失败 | leader_effective_group 未匹配 | 检查 users.group_name 字段 |
| 调组后家访 T-M7-T11 失败 | 历史与权限解耦未生效 | 重启后端 + 跑 migrate_step2 |
| 性能 PERF-1 > 2s | 用户/档案量大 | 检查 SQL 索引 + page_size |

---

*Step 5 测试完成且全部通过后，项目可进入上线审批阶段。*
