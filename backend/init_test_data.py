"""
初始化测试数据脚本
根据《测试手册-全功能测试》第二节要求，创建所有测试账号、技能标签和档案数据
"""
import requests
import json
import sys

# 设置标准输出编码为 UTF-8
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"

session = requests.Session()

def login(ehr_no: str, password: str) -> str:
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"ehr_no": ehr_no, "password": password})
    if resp.status_code != 200:
        raise Exception(f"登录失败 {ehr_no}: {resp.text}")
    return resp.json()["access_token"]

def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ============ 1. 管理员登录 ============
print("=" * 50)
print("1. 管理员登录 (0000001)")
admin_token = login("0000001", "1234567")
admin_headers = headers(admin_token)
print("[OK] 管理员登录成功")

# ============ 2. 创建 5 个测试账号 ============
print("\n" + "=" * 50)
print("2. 创建测试账号")

users = [
    {"ehr_no": "1000001", "name": "张组长", "group_name": "测试一组", "role": "leader", "initial_password": "Test@1234"},
    {"ehr_no": "1000002", "name": "李员工", "group_name": "测试一组", "role": "user", "initial_password": "Test@1234"},
    {"ehr_no": "1000003", "name": "王员工", "group_name": "测试一组", "role": "user", "initial_password": "Test@1234"},
    {"ehr_no": "1000004", "name": "赵员工", "group_name": "测试二组", "role": "user", "initial_password": "Test@1234"},
    {"ehr_no": "1000005", "name": "陈组长", "group_name": "测试二组", "role": "leader", "initial_password": "Test@1234"},
]

for u in users:
    resp = session.post(f"{BASE_URL}/api/admin/users", json=u, headers=admin_headers)
    if resp.status_code == 200:
        print(f"  [OK] {u['ehr_no']} {u['name']} 创建成功")
    else:
        print(f"  [FAIL] {u['ehr_no']} {u['name']} 创建失败: {resp.text}")

# ============ 3. 创建 6 个技能标签 ============
print("\n" + "=" * 50)
print("3. 创建技能标签模板")

skill_tags = ["Python", "数据分析", "项目管理", "舞蹈", "主持", "Java"]

for tag_name in skill_tags:
    resp = session.post(f"{BASE_URL}/api/skill-tags/templates", json={"name": tag_name}, headers=admin_headers)
    if resp.status_code == 200:
        print(f"  [OK] 标签「{tag_name}」创建成功")
    else:
        print(f"  [FAIL] 标签「{tag_name}」创建失败: {resp.text}")

# ============ 4. 获取标签ID映射 ============
print("\n" + "=" * 50)
print("4. 获取标签ID映射")
resp = session.get(f"{BASE_URL}/api/skill-tags/templates", headers=admin_headers)
tag_map = {}
if resp.status_code == 200:
    for tag in resp.json():
        tag_map[tag["name"]] = tag["id"]
    print(f"  [OK] 获取到 {len(tag_map)} 个标签")
    for name, tid in tag_map.items():
        print(f"    - {name}: {tid}")

# ============ 5. 完善李员工(1000002)档案 ============
print("\n" + "=" * 50)
print("5. 完善李员工(1000002)档案")

li_token = login("1000002", "Test@1234")
li_headers = headers(li_token)

# 5.1 更新基础信息
print("  5.1 更新基础信息...")
resp = session.put(f"{BASE_URL}/api/profile/me/base", json={
    "gender": "男",
    "nation": "汉族",
    "job_title": "柜面服务"
}, headers=li_headers)
status = "[OK]" if resp.status_code == 200 else "[FAIL]"
print(f"      {status} 基础信息: {resp.text}")

# 5.2 更新通讯信息
print("  5.2 更新通讯信息...")
resp = session.put(f"{BASE_URL}/api/profile/me/contact", json={
    "mobile": "13800000001",
    "commute_minutes": 20,
    "home_address": "北京市朝阳区测试路1号"
}, headers=li_headers)
status = "[OK]" if resp.status_code == 200 else "[FAIL]"
print(f"      {status} 通讯信息: {resp.text}")

# 5.3 添加技能标签
print("  5.3 添加技能标签...")
for tag_name in ["Python", "数据分析"]:
    resp = session.post(f"{BASE_URL}/api/profile/me/skill-tags", json={
        "tag_name": tag_name,
        "template_id": tag_map.get(tag_name)
    }, headers=li_headers)
    status = "[OK]" if resp.status_code == 200 else "[FAIL]"
    print(f"      {status} 添加标签「{tag_name}」: {resp.text}")

# 5.4 添加学历信息
print("  5.4 添加学历信息...")
resp = session.post(f"{BASE_URL}/api/profile/me/education", json={
    "education_level": "本科",
    "school": "测试大学",
    "graduation_date": "2020-06-01"
}, headers=li_headers)
status = "[OK]" if resp.status_code == 200 else "[FAIL]"
print(f"      {status} 学历信息: {resp.text}")

# ============ 6. 完善王员工(1000003)档案 ============
print("\n" + "=" * 50)
print("6. 完善王员工(1000003)档案")

wang_token = login("1000003", "Test@1234")
wang_headers = headers(wang_token)

# 6.1 更新基础信息
print("  6.1 更新基础信息...")
resp = session.put(f"{BASE_URL}/api/profile/me/base", json={
    "gender": "女",
    "job_title": "客户经理"
}, headers=wang_headers)
status = "[OK]" if resp.status_code == 200 else "[FAIL]"
print(f"      {status} 基础信息: {resp.text}")

# 6.2 更新通讯信息
print("  6.2 更新通讯信息...")
resp = session.put(f"{BASE_URL}/api/profile/me/contact", json={
    "mobile": "13800000002",
    "commute_minutes": 45,
    "home_address": "北京市海淀区测试路2号"
}, headers=wang_headers)
status = "[OK]" if resp.status_code == 200 else "[FAIL]"
print(f"      {status} 通讯信息: {resp.text}")

# 6.3 添加技能标签
print("  6.3 添加技能标签...")
for tag_name in ["舞蹈", "主持"]:
    resp = session.post(f"{BASE_URL}/api/profile/me/skill-tags", json={
        "tag_name": tag_name,
        "template_id": tag_map.get(tag_name)
    }, headers=wang_headers)
    status = "[OK]" if resp.status_code == 200 else "[FAIL]"
    print(f"      {status} 添加标签「{tag_name}」: {resp.text}")

# 6.4 添加家庭关系
print("  6.4 添加家庭关系...")
resp = session.post(f"{BASE_URL}/api/profile/me/family", json={
    "name": "王父",
    "relation": "父亲",
    "work_unit_and_title": "某公司"
}, headers=wang_headers)
status = "[OK]" if resp.status_code == 200 else "[FAIL]"
print(f"      {status} 家庭关系: {resp.text}")

# ============ 7. 管理员为李员工开启应急先锋队标识 ============
print("\n" + "=" * 50)
print("7. 开启李员工应急先锋队标识")
resp = session.post(f"{BASE_URL}/api/admin/users/1000002/toggle-emergency", headers=admin_headers)
if resp.status_code == 200:
    result = resp.json()
    is_emergency = "是" if result.get("is_emergency_staff") else "否"
    print(f"  [OK] 李员工应急先锋队标识: {is_emergency}")
else:
    print(f"  [FAIL] 操作失败: {resp.text}")

# ============ 8. 验证结果 ============
print("\n" + "=" * 50)
print("8. 验证初始化结果")

# 8.1 验证用户列表
resp = session.get(f"{BASE_URL}/api/admin/users?include_disabled=true", headers=admin_headers)
if resp.status_code == 200:
    data = resp.json()
    print(f"  [OK] 用户列表共 {data['total']} 条记录")
    for u in data["items"]:
        status_str = "正常" if not u["is_disabled"] else "已禁用"
        print(f"      - {u['ehr_no']} {u['name']} | 组别:{u['group_name']} | 角色:{u['role']} | 状态:{status_str}")

# 8.2 验证技能标签
resp = session.get(f"{BASE_URL}/api/skill-tags/templates", headers=admin_headers)
if resp.status_code == 200:
    tags = resp.json()
    tag_names = [t["name"] for t in tags]
    print(f"  [OK] 技能标签共 {len(tags)} 个: {tag_names}")

# 8.3 验证李员工档案
resp = session.get(f"{BASE_URL}/api/profile/me", headers=li_headers)
if resp.status_code == 200:
    profile = resp.json()
    skill_tags_result = [t["tag_name"] for t in profile.get("skill_tags", [])]
    commute = profile.get("contact", {}).get("commute_minutes", "未设置")
    edu_count = len(profile.get("education", []))
    print(f"  [OK] 李员工档案验证:")
    print(f"      - 技能标签: {skill_tags_result}")
    print(f"      - 通讯信息: 通勤{commute}分钟")
    print(f"      - 学历: {edu_count}条")

# 8.4 验证王员工档案
resp = session.get(f"{BASE_URL}/api/profile/me", headers=wang_headers)
if resp.status_code == 200:
    profile = resp.json()
    skill_tags_result = [t["tag_name"] for t in profile.get("skill_tags", [])]
    family_count = len(profile.get("family", []))
    print(f"  [OK] 王员工档案验证:")
    print(f"      - 技能标签: {skill_tags_result}")
    print(f"      - 家庭关系: {family_count}条")

print("\n" + "=" * 50)
print("初始化测试数据完成!")
print("=" * 50)
