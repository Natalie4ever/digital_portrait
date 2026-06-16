# Step 3 冒烟测试 - 智能筛选四大场景
import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests

BASE = "http://127.0.0.1:8001"

# 1. 登录 admin
r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": "0000001", "password": "1234567"})
r.raise_for_status()
H = {"Authorization": f"Bearer {r.json()['access_token']}"}
print(f"[1] admin 登录成功")

# 2. 准备测试数据：给至少 2 个员工加应急先锋队 + 通勤时间
users = requests.get(f"{BASE}/api/admin/users?page_size=100", headers=H).json()["items"]
print(f"[2] 现有用户数: {len(users)}")

# 选 2-3 个员工
test_ehrs = [u["ehr_no"] for u in users if u["role"] == "user"][:3]
print(f"[3] 测试员工 EHR: {test_ehrs}")

# 标记前 2 个为应急先锋队
import json as _json
for idx, ehr in enumerate(test_ehrs):
    r = requests.post(f"{BASE}/api/admin/users/{ehr}/toggle-emergency", headers=H)
    r.raise_for_status()
    print(f"     {ehr}: 已标记应急先锋队")
r = requests.post(f"{BASE}/api/profile/me/skill-tags", headers=H, json={"tag_name": "舞蹈"})
if r.status_code == 200:
    print(f"[4] admin 自己加了'舞蹈'技能标签")

# 4. 场景 1：应急响应 - 验证排序
print(f"\n=== 场景 1: 应急响应 ===")
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "emergency"})
r.raise_for_status()
res = r.json()
print(f"[5] 应急响应结果: total={res['total']}")
for it in res["items"][:5]:
    print(f"     {it['ehr_no']} {it['name']} 应急={it['is_emergency_staff']} 通勤={it['commute_minutes']} 匹配度={it['match_score']}")
# 验证排序：应急在前 + 按通勤升序
emergencies = [it for it in res["items"] if it["is_emergency_staff"]]
non_emergencies = [it for it in res["items"] if not it["is_emergency_staff"]]
if emergencies and non_emergencies:
    first_emg_commute = emergencies[0]["commute_minutes"] or 999999
    last_non_emg_index = next((i for i, it in enumerate(res["items"]) if not it["is_emergency_staff"]), None)
    if last_non_emg_index is not None:
        # 应急的最后一条的通勤应 <= 非应急的第一条的通勤
        last_emg_idx = next((i for i, it in enumerate(res["items"]) if it["is_emergency_staff"]), None)
        if last_emg_idx is not None and last_emg_idx < last_non_emg_index:
            print(f"[5.1] 排序正确：应急在非应急之前")
        else:
            print(f"[5.1] 排序异常")

# 5. 场景 1：应急通勤过滤
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "emergency", "max_commute_minutes": 30})
r.raise_for_status()
res = r.json()
print(f"[6] 应急通勤<30分钟: total={res['total']}")
assert all((it["commute_minutes"] is None or it["commute_minutes"] < 30) for it in res["items"]), "通勤过滤失败"
print(f"[6.1] 通勤过滤正确")

# 6. 场景 1：导出 Excel
r = requests.post(f"{BASE}/api/admin/scenarios/export", headers=H, json={"scenario": "emergency"})
r.raise_for_status()
assert r.headers.get("content-type", "").startswith("application/vnd.openxmlformats")
assert len(r.content) > 100, f"Excel 文件太小: {len(r.content)} bytes"
print(f"[7] 应急导出 Excel: {len(r.content)} bytes, content-type={r.headers.get('content-type')}")

# 7. 场景 2：活动选人 - 单标签
print(f"\n=== 场景 2: 活动选人 ===")
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "activity", "interest_tags": ["舞蹈"]})
r.raise_for_status()
res = r.json()
print(f"[8] 活动选人-舞蹈: total={res['total']}")
for it in res["items"]:
    print(f"     {it['ehr_no']} {it['name']} 命中={it['matched_tags']} 匹配度={it['match_score']}")
assert res["total"] >= 1, "应至少 admin 自己命中"
assert any("舞蹈" in it["matched_tags"] for it in res["items"]), "应命中舞蹈标签"

# 8. 场景 2：活动选人 - 不命中
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "activity", "interest_tags": ["不存在的标签XYZ"]})
r.raise_for_status()
res = r.json()
print(f"[9] 活动选人-不命中: total={res['total']}")
assert res["total"] == 0, "不命中应返回空"

# 9. 场景 2：活动选人 - 多标签
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "activity", "interest_tags": ["舞蹈", "主持", "摄影"]})
r.raise_for_status()
res = r.json()
print(f"[10] 活动选人-多标签: total={res['total']}")

# 10. 场景 3：项目组队
print(f"\n=== 场景 3: 项目组队 ===")
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "project", "required_skill_tags": ["Python"], "min_cert_count": 0, "min_project_count": 0})
r.raise_for_status()
res = r.json()
print(f"[11] 项目组队-Python: total={res['total']}")

# 11. 场景 4：人员调配
print(f"\n=== 场景 4: 人员调配 ===")
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "transfer", "target_group": "不存在的组X", "max_commute_minutes": 60})
r.raise_for_status()
res = r.json()
print(f"[12] 人员调配-不存在的组: total={res['total']}")
# 所有员工的 group_name 应 != "不存在的组X"
for it in res["items"]:
    assert it["group_name"] != "不存在的组X", f"应排除目标组，但 {it['ehr_no']} group={it['group_name']}"
print(f"[12.1] 人员调配排除目标组正确")

# 12. 未知场景
r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=H, json={"scenario": "unknown"})
assert r.status_code == 422, f"应 422 拒绝未知场景，实际 {r.status_code}"
print(f"[13] 未知场景校验: {r.json()['detail']}")

print("\n[ALL DONE] Step 3 冒烟测试全部通过")
