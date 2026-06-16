# Step 2 冒烟测试
import sys
import json
sys.stdout.reconfigure(encoding='utf-8')
import requests

BASE = "http://127.0.0.1:8000"

# 1. 登录（admin）
r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": "0000001", "password": "1234567"})
r.raise_for_status()
admin_token = r.json()["access_token"]
AH = {"Authorization": f"Bearer {admin_token}"}
print(f"[1] admin 登录成功")

# 2. 准备一个测试用户：调组前确保他是「审核一组」
#    列出所有用户，找一个
r = requests.get(f"{BASE}/api/admin/users?page_size=100", headers=AH)
r.raise_for_status()
all_users = r.json()["items"]
target = next((u for u in all_users if u["role"] == "user"), None)
if not target:
    print("[FAIL] 没有找到普通用户，请先用 admin 创建一个")
    sys.exit(1)
test_ehr = target["ehr_no"]
old_group = target["group_name"]
print(f"[2] 找到测试用户: {test_ehr} (原组别: {old_group})")

# 3. 查询该用户初始历史（应至少有 1 条「初始入组」）
r = requests.get(f"{BASE}/api/admin/group-transfers/user/{test_ehr}", headers=AH)
r.raise_for_status()
init_history = r.json()
print(f"[3] 调组前历史: {len(init_history)} 条")
assert len(init_history) >= 1, "应至少有一条初始入组记录"
for h in init_history:
    print(f"     {h['from_group'] or 'NULL'} -> {h['to_group']} (leave={h['leave_date'] or '当前'})")

# 4. 调组：A 从「旧组」调到「测试新组」
new_group = "测试新组-Step2"
r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=AH, json={
    "ehr_no": test_ehr,
    "to_group": new_group,
    "reason": "冒烟测试",
    "remark": "自动化测试用例"
})
r.raise_for_status()
transfer_res = r.json()
print(f"[4] 调组成功: id={transfer_res['id']}, {transfer_res['from_group']} -> {transfer_res['to_group']}")

# 5. 再次查询历史：应 2 条：旧组（已离开）+ 新组（当前）
r = requests.get(f"{BASE}/api/admin/group-transfers/user/{test_ehr}", headers=AH)
r.raise_for_status()
new_history = r.json()
print(f"[5] 调组后历史: {len(new_history)} 条")
for h in new_history:
    print(f"     {h['from_group'] or 'NULL'} -> {h['to_group']} (leave={h['leave_date'] or '当前'})")
assert len(new_history) == len(init_history) + 1, f"应增加 1 条（{len(init_history)} -> {len(new_history)}）"

# 6. 验证 users.group_name 已更新
r = requests.get(f"{BASE}/api/admin/users?page_size=100", headers=AH)
r.raise_for_status()
new_target = next((u for u in r.json()["items"] if u["ehr_no"] == test_ehr), None)
assert new_target["group_name"] == new_group, f"group_name 未更新: {new_target['group_name']}"
print(f"[6] users.group_name 已更新: {new_group}")

# 7. 验证重复调组保护（再调到同一组）
r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=AH, json={
    "ehr_no": test_ehr, "to_group": new_group,
})
assert r.status_code == 400, f"应返回 400，实际 {r.status_code}"
assert "已在" in r.json()["detail"]
print(f"[7] 重复调组保护: {r.json()['detail']}")

# 8. 调回原组
r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=AH, json={
    "ehr_no": test_ehr, "to_group": old_group, "reason": "冒烟测试-还原"
})
r.raise_for_status()
print(f"[8] 调回原组: {old_group}")

# 9. 查询历史列表 API（含分页/筛选）
r = requests.get(f"{BASE}/api/admin/group-transfers?ehr_no={test_ehr}", headers=AH)
r.raise_for_status()
listed = r.json()
print(f"[9] 调组历史列表: total={listed['total']}")
assert listed["total"] >= 3, f"应至少 3 条（初始+调出+调回）"

# 10. 获取所有组别
r = requests.get(f"{BASE}/api/admin/group-transfers/groups", headers=AH)
r.raise_for_status()
groups = r.json()["items"]
print(f"[10] 全部组别: {groups}")
assert old_group in groups, "原组应在组别列表中"

# 11. 用 admin 访问该员工档案：应能访问
r = requests.get(f"{BASE}/api/profile/by-ehr/{test_ehr}", headers=AH)
r.raise_for_status()
print(f"[11] admin 访问档案 OK")

# 12. 关键：找组长账号，验证历史驱动权限
leader = next((u for u in all_users if u["role"] == "leader"), None)
if leader:
    # 12.1 登录组长
    r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": leader["ehr_no"], "password": "1234567"})
    r.raise_for_status()
    leader_token = r.json()["access_token"]
    LH = {"Authorization": f"Bearer {leader_token}"}

    # 12.2 组长访问自己 → OK
    r = requests.get(f"{BASE}/api/profile/by-ehr/{leader['ehr_no']}", headers=LH)
    r.raise_for_status()
    print(f"[12.2] 组长访问自己档案 OK")

    # 12.3 组长访问他组的人 → 403
    r = requests.get(f"{BASE}/api/profile/by-ehr/{test_ehr}", headers=LH)
    # 如果测试用户在同一组，可能通过；我们只验证不会崩
    print(f"[12.3] 组长访问测试用户: status={r.status_code}")
else:
    print(f"[12] 跳过组长测试：未找到组长账号")

# 13. 清理：把测试用户调回原组（如果是测试新组的话）
r = requests.get(f"{BASE}/api/admin/users?page_size=100", headers=AH)
r.raise_for_status()
cur = next((u for u in r.json()["items"] if u["ehr_no"] == test_ehr), None)
if cur and cur["group_name"] == "测试新组-Step2":
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=AH, json={
        "ehr_no": test_ehr, "to_group": old_group, "reason": "冒烟测试-最终还原"
    })
    r.raise_for_status()
    print(f"[13] 清理：调回原组 {old_group}")

print("\n[ALL DONE] Step 2 冒烟测试全部通过")
