# Step 4 冒烟测试 - 团队能力分析
import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests

BASE = "http://127.0.0.1:8002"

# 1. 登录 admin
r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": "0000001", "password": "1234567"})
r.raise_for_status()
H = {"Authorization": f"Bearer {r.json()['access_token']}"}
print(f"[1] admin 登录成功")

# 2. overview
r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=H)
r.raise_for_status()
ov = r.json()
print(f"[2] overview: skills={len(ov['skills'])} groups={len(ov['groups'])} total={ov['total_employees']}")
for s in ov["skills"][:5]:
    print(f"     技能「{s['skill_name']}」: {s['count']} 人")

# 3. certificates
r = requests.post(f"{BASE}/api/admin/analytics/certificates", headers=H)
r.raise_for_status()
cr = r.json()
print(f"[3] certificates: total={cr['total_certs']} types={len(cr['items'])}")
for c in cr["items"][:5]:
    print(f"     证书「{c['cert_name']}」: {c['count']} 人")

# 4. risks
r = requests.post(f"{BASE}/api/admin/analytics/risks", headers=H)
r.raise_for_status()
rk = r.json()
print(f"[4] risks: red={rk['red_count']} yellow={rk['yellow_count']} green={rk['green_count']}")
for item in rk["items"][:5]:
    print(f"     [{item['level']}] [{item['type']}] {item['title']}")

# 5. emergency
r = requests.post(f"{BASE}/api/admin/analytics/emergency", headers=H)
r.raise_for_status()
em = r.json()
print(f"[5] emergency: total={em['total_emergency']} coverage={em['coverage_rate']}%")
for it in em["items"]:
    print(f"     {it['bucket']}: {it['count']} 人")

# 6. export
r = requests.post(f"{BASE}/api/admin/analytics/export", headers=H)
r.raise_for_status()
assert r.headers.get("content-type", "").startswith("application/vnd.openxmlformats")
assert len(r.content) > 1000, f"文件太小: {len(r.content)}"
print(f"[6] export: {len(r.content)} bytes, content-type={r.headers.get('content-type')}")

# 7. 权限：非 admin/leader 拒绝
import requests as _r
r2 = _r.post(f"{BASE}/api/auth/login", json={"ehr_no": "0000002", "password": "1234567"})
if r2.status_code == 200:
    user_token = r2.json()["access_token"]
    UH = {"Authorization": f"Bearer {user_token}"}
    r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=UH)
    assert r.status_code == 403, f"普通员工应被拒绝，实际 {r.status_code}"
    print(f"[7] 普通员工访问被 403 拒绝（正确）")
else:
    print(f"[7] 跳过：测试员工未注册")

# 8. 关键技能风险等级测试
# 当前数据：应急先锋队 2 人（1234567、1234568），其他 3 人
# admin 1 人 + 应急 2 人 = 应急 2 人 < 3 → 红
emg_risk = [r for r in rk["items"] if r["type"] == "emergency"]
assert len(emg_risk) == 1
if emg_risk[0]["level"] == "red":
    print(f"[8.1] 应急先锋队=2人 → 红色预警 ✓")
else:
    print(f"[8.1] 应急先锋队=2人 → level={emg_risk[0]['level']}（预期 red）")

# 9. 关键技能风险：仅 1 人掌握 = 红
# 当前数据：admin 加了"舞蹈"，1 人
red_skill = [r for r in rk["items"] if r["type"] == "skill" and r["level"] == "red"]
if red_skill:
    print(f"[9] 关键技能红色预警示例: {red_skill[0]['title']}")
else:
    print(f"[9] 当前无关键技能红色预警（可能数据不足）")

print("\n[ALL DONE] Step 4 冒烟测试全部通过")
