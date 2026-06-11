# 接口冒烟测试
import sys
import json
import requests

BASE = "http://127.0.0.1:8000"

# 1. 登录
r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": "0000001", "password": "1234567"})
r.raise_for_status()
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}
print(f"[1] 登录成功，token 前 20: {token[:20]}...")

# 2. 读取档案
r = requests.get(f"{BASE}/api/profile/me", headers=H)
r.raise_for_status()
d = r.json()
print(f"[2] GET /api/profile/me OK")
print(f"    is_emergency_staff: {d.get('base', {}).get('is_emergency_staff')}")
print(f"    development_intent: {d.get('development_intent')}")
print(f"    has old fields? pos={('development_positions' in d)}, dir={('development_directions' in d)}, plan={('development_plans' in d)}")

# 3. 保存发展意向
body = {
    "development_path": "管理发展路径",
    "short_term_goal": "1年内完成 PMP 认证",
    "mid_term_goal": "3年内成为团队主管",
    "core_abilities": ["沟通与影响力", "流程与项目管理"],
    "learning_methods": ["外部认证课程", "在线学习平台"],
    "learning_courses": "PMP、CFA Level 1",
    "rotation_interest": "是",
    "rotation_target": "总行风控部",
    "project_interests": ["数字化转型", "跨部门协同"],
    "other_comments": "希望参与数字化转型项目"
}
r = requests.put(f"{BASE}/api/profile/me/development-intent", headers=H, json=body)
r.raise_for_status()
print(f"[3] PUT /api/profile/me/development-intent OK -> id={r.json()['id']}")

# 4. 读取发展意向
r = requests.get(f"{BASE}/api/profile/me/development-intent", headers=H)
r.raise_for_status()
d = r.json()
print(f"[4] GET /api/profile/me/development-intent OK")
print(f"    path: {d.get('development_path')}")
print(f"    core_abilities: {d.get('core_abilities')}")
print(f"    project_interests: {d.get('project_interests')}")

# 5. 切换应急先锋队
r = requests.post(f"{BASE}/api/admin/users/0000001/toggle-emergency", headers=H)
r.raise_for_status()
print(f"[5] POST /api/admin/users/0000001/toggle-emergency -> {r.json()}")

# 6. 用户列表 - 验证 is_emergency_staff 字段返回
r = requests.get(f"{BASE}/api/admin/users?is_emergency_staff=true", headers=H)
r.raise_for_status()
items = r.json()["items"]
print(f"[6] GET /api/admin/users?is_emergency_staff=true -> total={len(items)}, first.is_emergency_staff={items[0].get('is_emergency_staff') if items else None}")

# 7. 档案列表 - 验证 is_emergency_staff 字段
r = requests.get(f"{BASE}/api/profile/admin/list?is_emergency_staff=true", headers=H)
r.raise_for_status()
items = r.json()["items"]
print(f"[7] GET /api/profile/admin/list?is_emergency_staff=true -> total={len(items)}, first.is_emergency_staff={items[0].get('is_emergency_staff') if items else None}")

# 8. 改回
r = requests.post(f"{BASE}/api/admin/users/0000001/toggle-emergency", headers=H)
r.raise_for_status()
print(f"[8] 切换回原状态 -> {r.json()}")

print("\n[ALL DONE] 冒烟测试全部通过")
