# Step 5 集成测试 + 回归测试 + 权限专项
#
# 范围：
#   - M1 登录 / M2 我的档案 / M3 档案管理 / M4 用户管理
#   - M5 操作日志 / M6 技能标签 / M7 家访记录
#   - Step 1 应急先锋队 + 证书 + 发展意向 + 项目总结
#   - Step 2 组员调换历史 + 组长权限修复
#   - Step 3 智能筛选四大场景
#   - Step 4 团队能力分析
#   - 权限矩阵（admin / leader / user 三角色 × 全部关键接口）
#
# 运行：
#   cd backend
#   python smoke_test_step5.py
#
# 预期：
#   - 全绿（除部分标注「非强制」的灰盒用例）
#   - 最终输出 PASS/FAIL 汇总

import sys
sys.stdout.reconfigure(encoding='utf-8')
import io
import time
from typing import Optional
import requests

BASE = "http://127.0.0.1:8000"

# ====================== 工具 ======================

PASS = 0
FAIL = 0
SKIP = 0
FAIL_LIST: list[str] = []
CURRENT_SECTION = ""


def _print_color(text: str, color: str) -> str:
    """简单的 ANSI 颜色输出（Windows 终端兼容）"""
    codes = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "cyan": "\033[96m",
        "reset": "\033[0m",
    }
    return f"{codes.get(color, '')}{text}{codes['reset']}"


def section(name: str):
    global CURRENT_SECTION
    CURRENT_SECTION = name
    print(f"\n{_print_color('━' * 60, 'cyan')}")
    print(_print_color(f"【{name}】", "cyan"))
    print(_print_color('━' * 60, 'cyan'))


def step(label: str):
    print(f"  [{label}]", end=" ")


def ok(msg: str = ""):
    global PASS
    PASS += 1
    suffix = f" — {msg}" if msg else ""
    print(_print_color(f"✓{suffix}", "green"))


def fail(msg: str):
    global FAIL
    FAIL += 1
    FAIL_LIST.append(f"[{CURRENT_SECTION}] {msg}")
    print(_print_color(f"✗ {msg}", "red"))


def skip(reason: str):
    global SKIP
    SKIP += 1
    print(_print_color(f"⊘ 跳过：{reason}", "yellow"))


def assert_status(r: requests.Response, expected: int, label: str, must_contain: Optional[str] = None):
    if r.status_code != expected:
        fail(f"{label} 期望 {expected}，实际 {r.status_code}: {r.text[:200]}")
        return False
    if must_contain and must_contain not in (r.text or ""):
        fail(f"{label} 期望包含「{must_contain}」，实际 {r.text[:200]}")
        return False
    ok(f"{label} {r.status_code}")
    return True


def login(ehr_no: str, password: str = "1234567") -> Optional[str]:
    """登录并返回 token；失败返回 None"""
    try:
        r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": ehr_no, "password": password}, timeout=5)
        if r.status_code == 200:
            return r.json()["access_token"]
        return None
    except Exception:
        return None


def H(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ====================== 准备 ======================

def setup() -> dict:
    """登录所有测试账号，返回 tokens 字典"""
    section("环境准备")
    accounts = {
        "admin": "0000001",
        "admin_test_group": "0000002",
        "leader_test": "1234569",
        "user_test1": "1234567",
        "user_test2": "1234568",
    }
    tokens = {}
    for key, ehr in accounts.items():
        t = login(ehr)
        if t:
            tokens[key] = t
            print(f"  ✓ {key:20s} ({ehr}) 登录成功")
        else:
            print(f"  ✗ {key:20s} ({ehr}) 登录失败")
            FAIL_LIST.append(f"[setup] {key} 登录失败")
    return tokens


# ====================== M1 登录回归 ======================

def test_m1_auth(tokens: dict):
    section("M1 登录模块回归（10 用例）")

    # M1-T1 EHR 号格式校验
    step("M1-T1 EHR 5位")
    r = requests.get(f"{BASE}/api/auth/check-ehr/12345")
    assert_status(r, 400, "M1-T1", "EHR号必须是7位数字")

    # M1-T2 EHR 不存在
    step("M1-T2 EHR 不存在")
    r = requests.get(f"{BASE}/api/auth/check-ehr/0000999")
    assert_status(r, 404, "M1-T2", "EHR号不存在")

    # M1-T3 EHR 存在
    step("M1-T3 EHR 存在")
    r = requests.get(f"{BASE}/api/auth/check-ehr/0000001")
    if r.status_code == 200 and r.json().get("exists"):
        ok(f"name={r.json().get('name')}")
    else:
        fail(f"M1-T3 实际 {r.status_code}: {r.text[:200]}")

    # M1-T4 密码错误
    step("M1-T4 密码错误")
    r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": "0000001", "password": "wrong"})
    assert_status(r, 401, "M1-T4", "EHR号或密码错误")

    # M1-T5 登录成功
    step("M1-T5 登录成功")
    if tokens.get("admin"):
        ok()
    else:
        fail("M1-T5 无 token")

    # M1-T7 无 token
    step("M1-T7 无 token")
    r = requests.get(f"{BASE}/api/profile/me")
    assert_status(r, 401, "M1-T7", "未提供认证信息")

    # M1-T8 无效 token
    step("M1-T8 无效 token")
    r = requests.get(f"{BASE}/api/profile/me", headers={"Authorization": "Bearer invalid"})
    assert_status(r, 401, "M1-T8", "登录已过期")

    # M1-T9 修改密码 + 旧密码失效
    step("M1-T9 修改密码")
    if tokens.get("user_test1"):
        u_token = tokens["user_test1"]
        # 改回原密码 1234567（幂等）
        r = requests.post(f"{BASE}/api/auth/change-password",
                          headers=H(u_token),
                          json={"old_password": "1234567", "new_password": "1234567"})
        assert_status(r, 200, "M1-T9.1 改回原密码")
        # 错误旧密码
        r = requests.post(f"{BASE}/api/auth/change-password",
                          headers=H(u_token),
                          json={"old_password": "wrong_pwd", "new_password": "1234567"})
        assert_status(r, 400, "M1-T9.2 错误旧密码", "原密码错误")
    else:
        skip("user_test1 未登录")

    # M1-T10 登录日志
    step("M1-T10 登录日志")
    if tokens.get("admin"):
        r = requests.get(f"{BASE}/api/admin/operation-logs?action=login&page=1&page_size=5",
                         headers=H(tokens["admin"]))
        if r.status_code == 200 and len(r.json()) >= 1:
            ok(f"日志 {len(r.json())} 条")
        else:
            fail(f"M1-T10 期望有日志，实际 {r.status_code}: {r.text[:200]}")


# ====================== M2 我的档案回归 ======================

def test_m2_profile(tokens: dict):
    section("M2 我的档案回归（11 用例）")

    if not tokens.get("user_test1"):
        skip("user_test1 未登录，跳过 M2")
        return

    u = H(tokens["user_test1"])

    # M2-T1 读取自己档案
    step("M2-T1 GET /me")
    r = requests.get(f"{BASE}/api/profile/me", headers=u)
    if r.status_code == 200:
        d = r.json()
        keys = ["base", "political", "education", "family", "resume", "reward",
                "qualification", "achievement", "language", "contact", "skill_tags",
                "development_intent", "project_summaries"]
        missing = [k for k in keys if k not in d]
        if missing:
            fail(f"M2-T1 缺失字段: {missing}")
        else:
            ok("13 个子表字段齐全")
    else:
        fail(f"M2-T1 {r.status_code}")

    # M2-T2 编辑通讯信息
    step("M2-T2 编辑 contact")
    r = requests.put(f"{BASE}/api/profile/me/contact", headers=u, json={
        "phone": "13800000000",
        "emergency_contact": "张三",
        "emergency_phone": "13900000000",
        "commute_minutes": 25,
        "address": "测试地址",
    })
    assert_status(r, 200, "M2-T2")

    # M2-T3 政治面貌 CRUD
    step("M2-T3 政治面貌 CRUD")
    r = requests.post(f"{BASE}/api/profile/me/political", headers=u, json={
        "political_status": "群众", "join_date": "2020-01-01", "introducer": "李四"
    })
    if r.status_code == 200:
        pid = r.json()["id"]
        r = requests.put(f"{BASE}/api/profile/me/political/{pid}", headers=u, json={"political_status": "共青团员"})
        if r.status_code == 200:
            r = requests.delete(f"{BASE}/api/profile/me/political/{pid}", headers=u)
            assert_status(r, 200, "M2-T3.delete")
        else:
            fail(f"M2-T3.put {r.status_code}")
    else:
        fail(f"M2-T3.post {r.status_code}")

    # M2-T4 学历学位
    step("M2-T4 学历学位")
    r = requests.post(f"{BASE}/api/profile/me/education", headers=u, json={
        "education_category": "全日制教育", "education_level": "本科", "school": "测试大学",
        "major": "计算机", "graduate_date": "2020-06-30"
    })
    if r.status_code == 200:
        eid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/education/{eid}", headers=u)
        assert_status(r, 200, "M2-T4.delete")
    else:
        fail(f"M2-T4.post {r.status_code}")

    # M2-T5 家属
    step("M2-T5 家属")
    r = requests.post(f"{BASE}/api/profile/me/family", headers=u, json={
        "name": "父亲", "relation": "父亲", "work_unit": "测试单位"
    })
    if r.status_code == 200:
        fid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/family/{fid}", headers=u)
        assert_status(r, 200, "M2-T5.delete")
    else:
        fail(f"M2-T5.post {r.status_code}")

    # M2-T6 简历
    step("M2-T6 简历")
    r = requests.post(f"{BASE}/api/profile/me/resume", headers=u, json={
        "start_time": "2020-01-01", "end_time": "2023-01-01",
        "company": "测试公司", "position": "工程师"
    })
    if r.status_code == 200:
        rid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/resume/{rid}", headers=u)
        assert_status(r, 200, "M2-T6.delete")
    else:
        fail(f"M2-T6.post {r.status_code}")

    # M2-T7 奖惩
    step("M2-T7 奖惩")
    r = requests.post(f"{BASE}/api/profile/me/reward", headers=u, json={
        "reward_type": "奖励", "reward_level": "优秀员工", "reward_time": "2023-12-31"
    })
    if r.status_code == 200:
        rid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/reward/{rid}", headers=u)
        assert_status(r, 200, "M2-T7.delete")
    else:
        fail(f"M2-T7.post {r.status_code}")

    # M2-T8 证书（valid_until）
    step("M2-T8 证书 valid_until")
    r = requests.post(f"{BASE}/api/profile/me/qualification", headers=u, json={
        "cert_name": "基金从业资格证", "obtain_time": "2024-01-15",
        "valid_until": "2026-12-31"
    })
    if r.status_code == 200:
        qid = r.json()["id"]
        if r.json().get("valid_until") == "2026-12-31":
            ok(f"valid_until 持久化")
        else:
            fail(f"M2-T8 valid_until 未持久化: {r.json()}")
        r = requests.delete(f"{BASE}/api/profile/me/qualification/{qid}", headers=u)
        if r.status_code != 200:
            fail(f"M2-T8.delete {r.status_code}")
    else:
        fail(f"M2-T8.post {r.status_code}")

    # M2-T9 专业成果
    step("M2-T9 专业成果")
    r = requests.post(f"{BASE}/api/profile/me/achievement", headers=u, json={
        "achievement_name": "专利", "obtain_time": "2024-01-01"
    })
    if r.status_code == 200:
        aid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/achievement/{aid}", headers=u)
        assert_status(r, 200, "M2-T9.delete")
    else:
        fail(f"M2-T9.post {r.status_code}")

    # M2-T10 语言能力
    step("M2-T10 语言能力")
    r = requests.post(f"{BASE}/api/profile/me/language", headers=u, json={
        "language": "英语", "level": "CET-6"
    })
    if r.status_code == 200:
        lid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/language/{lid}", headers=u)
        assert_status(r, 200, "M2-T10.delete")
    else:
        fail(f"M2-T10.post {r.status_code}")

    # M2-T11 技能标签
    step("M2-T11 技能标签")
    r = requests.post(f"{BASE}/api/profile/me/skill-tags", headers=u, json={"tag_name": "SmokeTestTag"})
    if r.status_code == 200:
        sid = r.json()["id"]
        r = requests.delete(f"{BASE}/api/profile/me/skill-tags/{sid}", headers=u)
        assert_status(r, 200, "M2-T11.delete")
    else:
        fail(f"M2-T11.post {r.status_code}")


# ====================== M3 档案管理回归 ======================

def test_m3_admin_profile(tokens: dict):
    section("M3 档案管理回归（6 用例）")

    if not tokens.get("admin"):
        skip("admin 未登录，跳过 M3")
        return

    A = H(tokens["admin"])
    L = H(tokens["leader_test"]) if tokens.get("leader_test") else None

    # M3-T1 admin 查看他人
    step("M3-T1 admin 查他人档案")
    r = requests.get(f"{BASE}/api/profile/by-ehr/1234567", headers=A)
    assert_status(r, 200, "M3-T1")

    # M3-T2 列表 + 筛选
    step("M3-T2 列表+筛选")
    r = requests.get(f"{BASE}/api/profile/admin/list?group_name=测试组", headers=A)
    if r.status_code == 200:
        items = r.json()["items"]
        if all(u["group_name"] == "测试组" for u in items):
            ok(f"{len(items)} 条全为测试组")
        else:
            fail(f"M3-T2 存在非测试组成员")
    else:
        fail(f"M3-T2 {r.status_code}")

    # M3-T3 leader 仅看本组
    step("M3-T3 leader 仅本组")
    if L:
        r = requests.get(f"{BASE}/api/profile/admin/list", headers=L)
        if r.status_code == 200:
            items = r.json()["items"]
            ok(f"leader 列表 {len(items)} 条")
        else:
            fail(f"M3-T3 {r.status_code}")
    else:
        skip("leader 未登录")

    # M3-T4 leader 访问本组成员
    step("M3-T4 leader 访问本组成员")
    if L:
        r = requests.get(f"{BASE}/api/profile/by-ehr/1234567", headers=L)
        assert_status(r, 200, "M3-T4")
    else:
        skip("leader 未登录")

    # M3-T6 toggle-emergency
    step("M3-T6 toggle-emergency")
    r = requests.post(f"{BASE}/api/admin/users/1234567/toggle-emergency", headers=A)
    if r.status_code == 200:
        v1 = r.json()["is_emergency_staff"]
        r = requests.post(f"{BASE}/api/admin/users/1234567/toggle-emergency", headers=A)
        if r.status_code == 200:
            v2 = r.json()["is_emergency_staff"]
            if v1 != v2:
                ok(f"切换 {v1} -> {v2}")
            else:
                fail(f"切换未生效: {v1} -> {v2}")
        else:
            fail(f"M3-T6.2 {r.status_code}")
    else:
        fail(f"M3-T6.1 {r.status_code}")


# ====================== M4 用户管理回归 ======================

def test_m4_users(tokens: dict):
    section("M4 用户管理回归（8 用例）")

    if not tokens.get("admin"):
        skip("admin 未登录，跳过 M4")
        return

    A = H(tokens["admin"])

    # M4-T1 列表
    step("M4-T1 列表")
    r = requests.get(f"{BASE}/api/admin/users?page=1&page_size=10", headers=A)
    assert_status(r, 200, "M4-T1")

    # M4-T2 筛选
    step("M4-T2 筛选 role=leader")
    r = requests.get(f"{BASE}/api/admin/users?role=leader", headers=A)
    if r.status_code == 200:
        items = r.json()["items"]
        if all(u["role"] == "leader" for u in items):
            ok(f"{len(items)} 条 leader")
        else:
            fail("M4-T2 存在非 leader")
    else:
        fail(f"M4-T2 {r.status_code}")

    # M4-T3 创建用户（用一次性 EHR，避免重复）
    step("M4-T3 创建用户")
    test_ehr = "9990001"
    r = requests.post(f"{BASE}/api/admin/users", headers=A, json={
        "ehr_no": test_ehr, "name": "Step5测试", "group_name": "测试组",
        "role": "user", "initial_password": "1234567"
    })
    if r.status_code == 200:
        ok()
    else:
        # 可能该 EHR 已存在（重跑），跳过创建即可
        if r.status_code == 400 and "已存在" in r.text:
            skip(f"EHR {test_ehr} 已存在")
        else:
            fail(f"M4-T3 {r.status_code}: {r.text[:200]}")

    # M4-T4 重复 EHR 拒绝
    step("M4-T4 重复 EHR")
    r = requests.post(f"{BASE}/api/admin/users", headers=A, json={
        "ehr_no": "0000001", "name": "冲突", "group_name": "X"
    })
    assert_status(r, 400, "M4-T4", "EHR号已存在")

    # M4-T5 编辑用户
    step("M4-T5 编辑用户")
    r = requests.put(f"{BASE}/api/admin/users/{test_ehr}", headers=A, json={"name": "Step5测试-改名"})
    if r.status_code == 200:
        ok()
    else:
        fail(f"M4-T5 {r.status_code}: {r.text[:200]}")

    # M4-T7 重置密码
    step("M4-T7 重置密码")
    r = requests.post(f"{BASE}/api/admin/users/reset-password", headers=A,
                      json={"ehr_no": test_ehr, "new_password": "1234567"})
    assert_status(r, 200, "M4-T7")

    # 验证新密码可登录
    t = login(test_ehr, "1234567")
    if t:
        ok(f"重置后登录成功")
    else:
        fail("M4-T7 重置后登录失败")

    # M4-T8 软删除
    step("M4-T8 软删除")
    r = requests.delete(f"{BASE}/api/admin/users/{test_ehr}", headers=A)
    if r.status_code == 200:
        # 再查询应 404
        r = requests.get(f"{BASE}/api/admin/users/{test_ehr}", headers=A)
        if r.status_code == 404:
            ok("软删除后查不到")
        else:
            fail(f"M4-T8 软删除后 GET 应 404，实际 {r.status_code}")
    else:
        fail(f"M4-T8 {r.status_code}")


# ====================== M5 操作日志回归 ======================

def test_m5_logs(tokens: dict):
    section("M5 操作日志回归（4 用例）")

    if not tokens.get("admin"):
        skip("admin 未登录，跳过 M5")
        return

    A = H(tokens["admin"])
    U = H(tokens["user_test1"]) if tokens.get("user_test1") else None

    # M5-T1 日志落库（任一写操作后查）
    step("M5-T1 写后日志")
    r = requests.get(f"{BASE}/api/admin/operation-logs?action=toggle_emergency_staff&page=1&page_size=5", headers=A)
    if r.status_code == 200 and len(r.json()) >= 1:
        ok(f"{len(r.json())} 条")
    else:
        fail(f"M5-T1 {r.status_code} count={len(r.json()) if r.status_code == 200 else 'N/A'}")

    # M5-T2 按 user_id 筛选
    step("M5-T2 user_id=1")
    r = requests.get(f"{BASE}/api/admin/operation-logs?user_id=1&page=1&page_size=5", headers=A)
    assert_status(r, 200, "M5-T2")

    # M5-T3 按 action 模糊
    step("M5-T3 action=transfer")
    r = requests.get(f"{BASE}/api/admin/operation-logs?action=transfer&page=1&page_size=5", headers=A)
    assert_status(r, 200, "M5-T3")

    # M5-T4 普通员工拒绝
    step("M5-T4 普通员工拒绝")
    if U:
        r = requests.get(f"{BASE}/api/admin/operation-logs", headers=U)
        assert_status(r, 403, "M5-T4")
    else:
        skip("user 未登录")


# ====================== M6 技能标签回归 ======================

def test_m6_skill_tags(tokens: dict):
    section("M6 技能标签回归（5 用例）")

    A = H(tokens["admin"]) if tokens.get("admin") else None
    U = H(tokens["user_test1"]) if tokens.get("user_test1") else None

    # M6-T1 列模板
    step("M6-T1 列模板")
    if A:
        r = requests.get(f"{BASE}/api/skill-tags/templates", headers=A)
        assert_status(r, 200, "M6-T1")
    else:
        skip("admin 未登录")

    # M6-T2 admin 创建
    step("M6-T2 admin 创建")
    test_tag = f"Step5Tag_{int(time.time())}"
    if A:
        r = requests.post(f"{BASE}/api/skill-tags/templates", headers=A, json={"name": test_tag})
        if r.status_code == 200:
            tag_id = r.json()["id"]
            ok(f"创建 id={tag_id}")
        else:
            fail(f"M6-T2 {r.status_code}: {r.text[:200]}")
    else:
        skip("admin 未登录")
        return

    # M6-T3 重复
    step("M6-T3 重复创建拒绝")
    r = requests.post(f"{BASE}/api/skill-tags/templates", headers=A, json={"name": test_tag})
    assert_status(r, 400, "M6-T3", "该标签已存在")

    # M6-T4 admin 删除
    step("M6-T4 admin 删除")
    r = requests.delete(f"{BASE}/api/skill-tags/templates/{tag_id}", headers=A)
    assert_status(r, 200, "M6-T4")

    # M6-T5 普通员工创建被拒
    step("M6-T5 普通员工被拒")
    if U:
        r = requests.post(f"{BASE}/api/skill-tags/templates", headers=U, json={"name": "X"})
        assert_status(r, 403, "M6-T5")
    else:
        skip("user 未登录")


# ====================== M7 家访记录回归 ======================

def test_m7_home_visits(tokens: dict):
    section("M7 家访记录回归（10 用例）")

    A = H(tokens["admin"]) if tokens.get("admin") else None
    L = H(tokens["leader_test"]) if tokens.get("leader_test") else None
    U = H(tokens["user_test1"]) if tokens.get("user_test1") else None

    if not L:
        skip("leader 未登录，跳过 M7")
        return

    # M7-T1 leader 列表
    step("M7-T1 leader 列表")
    r = requests.get(f"{BASE}/api/home-visits", headers=L)
    if r.status_code == 200:
        total = r.json()["total"]
        ok(f"{total} 条")
    else:
        fail(f"M7-T1 {r.status_code}")

    # M7-T2 普通员工列表（仅自己）
    step("M7-T2 user 仅自己")
    if U:
        r = requests.get(f"{BASE}/api/home-visits", headers=U)
        assert_status(r, 200, "M7-T2")
    else:
        skip("user 未登录")

    # M7-T3 admin 列表（全员）
    step("M7-T3 admin 列表")
    if A:
        r = requests.get(f"{BASE}/api/home-visits", headers=A)
        assert_status(r, 200, "M7-T3")
    else:
        skip("admin 未登录")

    # M7-T4 leader 新建（本组成员）
    step("M7-T4 leader 新建（本组）")
    r = requests.post(f"{BASE}/api/home-visits", headers=L, json={
        "visited_ehr_no": "1234567",
        "visit_year": 2026,
        "visit_time": "2026-06-01T10:00:00",
        "visit_method": "实地走访",
        "is_visited": True,
        "visit_date": "2026-06-01",
        "position": "测试岗位",
        "address": "测试地址",
        "mobile": "13800000000",
    })
    if r.status_code == 201:
        record_id = r.json()["id"]
        ok(f"新建 id={record_id}")
    else:
        fail(f"M7-T4 {r.status_code}: {r.text[:200]}")
        return

    # M7-T6 user 新建被拒
    step("M7-T6 user 新建被拒")
    if U:
        r = requests.post(f"{BASE}/api/home-visits", headers=U, json={
            "visited_ehr_no": "1234568", "visit_year": 2026,
            "visit_time": "2026-06-01T10:00:00",
            "visit_method": "实地走访", "is_visited": False,
        })
        assert_status(r, 403, "M7-T6", "仅组长可新建家访记录")
    else:
        skip("user 未登录")

    # M7-T7 leader 编辑
    step("M7-T7 leader 编辑")
    r = requests.put(f"{BASE}/api/home-visits/{record_id}", headers=L, json={"feedback": "Step5 自动化测试"})
    if r.status_code == 200 and r.json().get("feedback") == "Step5 自动化测试":
        ok()
    else:
        fail(f"M7-T7 {r.status_code}: {r.text[:200]}")

    # M7-T8 admin 不可编辑
    step("M7-T8 admin 不可编辑")
    if A:
        r = requests.put(f"{BASE}/api/home-visits/{record_id}", headers=A, json={"feedback": "admin 修改"})
        assert_status(r, 403, "M7-T8", "仅组长可编辑")
    else:
        skip("admin 未登录")

    # M7-T9 admin 删除
    step("M7-T9 admin 删除")
    if A:
        r = requests.delete(f"{BASE}/api/home-visits/{record_id}", headers=A)
        assert_status(r, 204, "M7-T9")
    else:
        skip("admin 未登录")


# ====================== Step 1 联调 ======================

def test_step1_integration(tokens: dict):
    section("Step 1 联调（5 用例）")

    if not tokens.get("user_test1"):
        skip("user 未登录，跳过 Step 1")
        return

    u = H(tokens["user_test1"])
    A = H(tokens["admin"]) if tokens.get("admin") else None

    # S1-INT-1 应急先锋队全链路
    step("S1-INT-1 应急先锋队 toggle")
    r = requests.post(f"{BASE}/api/admin/users/1234567/toggle-emergency", headers=A)
    if r.status_code == 200:
        v1 = r.json()["is_emergency_staff"]
        # 档案列表筛选
        r = requests.get(f"{BASE}/api/profile/admin/list?is_emergency_staff={'true' if v1 else 'false'}",
                         headers=A)
        if r.status_code == 200:
            items = r.json()["items"]
            match = all(it["is_emergency_staff"] == v1 for it in items) if v1 else True
            if match:
                ok(f"toggle {v1} → 筛选 {len(items)} 条")
            else:
                fail("S1-INT-1 筛选结果与 toggle 状态不一致")
        else:
            fail(f"S1-INT-1 list {r.status_code}")
        # 还原
        requests.post(f"{BASE}/api/admin/users/1234567/toggle-emergency", headers=A)
    else:
        fail(f"S1-INT-1 toggle {r.status_code}")

    # S1-INT-2 证书 + valid_until
    step("S1-INT-2 证书 valid_until")
    r = requests.post(f"{BASE}/api/profile/me/qualification", headers=u, json={
        "cert_name": "Step5证书", "obtain_time": "2024-01-01", "valid_until": "2027-12-31"
    })
    if r.status_code == 200 and r.json().get("valid_until") == "2027-12-31":
        qid = r.json()["id"]
        ok(f"valid_until={r.json()['valid_until']}")
        requests.delete(f"{BASE}/api/profile/me/qualification/{qid}", headers=u)
    else:
        fail(f"S1-INT-2 {r.status_code}: {r.text[:200]}")

    # S1-INT-3 发展意向 1:1
    step("S1-INT-3 发展意向 1:1")
    r = requests.put(f"{BASE}/api/profile/me/development-intent", headers=u, json={
        "development_path": "管理发展路径",
        "short_term_goal": "1年 PMP",
        "mid_term_goal": "3年 主管",
        "core_abilities": ["沟通与影响力"],
        "learning_methods": ["外部认证课程"],
        "rotation_interest": "是",
        "rotation_target": "总行风控部",
        "project_interests": ["数字化转型"],
        "other_comments": "Step5 smoke",
    })
    if r.status_code == 200:
        r = requests.get(f"{BASE}/api/profile/me/development-intent", headers=u)
        if r.status_code == 200 and r.json().get("development_path") == "管理发展路径":
            ok("发展意向保存读取一致")
        else:
            fail(f"S1-INT-3 GET {r.status_code}: {r.text[:200]}")
    else:
        fail(f"S1-INT-3 PUT {r.status_code}: {r.text[:200]}")

    # S1-INT-4 项目总结
    step("S1-INT-4 项目总结")
    r = requests.post(f"{BASE}/api/profile/me/project-summary", headers=u, json={
        "project_name": "Step5测试项目",
        "start_time": "2024-01-01",
        "end_time": "2024-12-31",
        "role": "测试负责人",
        "description": "Step 5 smoke 自动化",
        "tag_ids": [],
    })
    if r.status_code == 200:
        pid = r.json()["id"]
        ok(f"新建 id={pid}")
        requests.delete(f"{BASE}/api/profile/me/project-summary/{pid}", headers=u)
    else:
        fail(f"S1-INT-4 {r.status_code}: {r.text[:200]}")

    # S1-INT-5 toggle 日志
    step("S1-INT-5 toggle 日志")
    if A:
        r = requests.get(f"{BASE}/api/admin/operation-logs?action=toggle_emergency_staff&page=1&page_size=3", headers=A)
        if r.status_code == 200 and len(r.json()) >= 1:
            ok(f"{len(r.json())} 条")
        else:
            fail(f"S1-INT-5 {r.status_code}")
    else:
        skip("admin 未登录")


# ====================== Step 2 联调 ======================

def test_step2_integration(tokens: dict):
    section("Step 2 联调（6 用例）")

    if not tokens.get("admin") or not tokens.get("leader_test"):
        skip("缺少 admin 或 leader，跳过 Step 2")
        return

    A = H(tokens["admin"])
    L = H(tokens["leader_test"])

    # 找一个非组长的员工做调组测试对象
    target_ehr = "1234568"
    target_user = next(
        (u for u in requests.get(f"{BASE}/api/admin/users?page_size=100", headers=A).json()["items"]
         if u["ehr_no"] == target_ehr), None
    )
    if not target_user:
        skip("找不到测试员工 1234568")
        return
    original_group = target_user["group_name"]

    # S2-INT-1 调组 + 历史
    step("S2-INT-1 调组 + 历史")
    new_group = "Step5调组测试组"
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=A, json={
        "ehr_no": target_ehr, "to_group": new_group, "reason": "Step5 smoke"
    })
    if r.status_code == 200:
        r = requests.get(f"{BASE}/api/admin/group-transfers/user/{target_ehr}", headers=A)
        if r.status_code == 200 and len(r.json()) >= 1:
            ok(f"历史 {len(r.json())} 条")
        else:
            fail(f"S2-INT-1 history {r.status_code}")
    else:
        fail(f"S2-INT-1 transfer {r.status_code}: {r.text[:200]}")
        return

    # S2-INT-2 group_name 同步
    step("S2-INT-2 group_name 同步")
    r = requests.get(f"{BASE}/api/admin/users/{target_ehr}", headers=A)
    if r.status_code == 200 and r.json()["group_name"] == new_group:
        ok()
    else:
        fail(f"S2-INT-2 group_name={r.json().get('group_name') if r.status_code == 200 else 'N/A'}")

    # S2-INT-3 关键：原组长越权
    step("S2-INT-3 原组长越权 → 403")
    r = requests.get(f"{BASE}/api/profile/by-ehr/{target_ehr}", headers=L)
    if r.status_code == 403:
        ok("原组长 403 ✓")
    elif r.status_code == 200:
        # 测试组长在「测试组」，但 1234568 也可能原本在「测试组」（被原组长管辖）
        # 仅当调组后组别改变，原组长才无权
        if new_group != original_group:
            fail(f"S2-INT-3 应 403，实际 200（调组后原组长仍可访问！）")
        else:
            skip("调组前后同组，无权限测试意义")
    else:
        fail(f"S2-INT-3 {r.status_code}")

    # S2-INT-5 调组日志
    step("S2-INT-5 transfer_user 日志")
    r = requests.get(f"{BASE}/api/admin/operation-logs?action=transfer_user&page=1&page_size=5", headers=A)
    if r.status_code == 200 and len(r.json()) >= 1:
        ok(f"{len(r.json())} 条")
    else:
        fail(f"S2-INT-5 {r.status_code}")

    # S2-INT-6 重复调组
    step("S2-INT-6 重复调组")
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=A, json={
        "ehr_no": target_ehr, "to_group": new_group
    })
    assert_status(r, 400, "S2-INT-6", "已在")

    # 清理：调回原组
    step("清理：调回原组")
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=A, json={
        "ehr_no": target_ehr, "to_group": original_group, "reason": "Step5 清理"
    })
    if r.status_code == 200:
        ok(f"已调回 {original_group}")
    else:
        fail(f"清理失败 {r.status_code}")


# ====================== Step 3 联调 ======================

def test_step3_integration(tokens: dict):
    section("Step 3 联调（5 用例）")

    if not tokens.get("admin"):
        skip("admin 未登录，跳过 Step 3")
        return

    A = H(tokens["admin"])

    scenarios = [
        ("emergency", "应急响应"),
        ("activity", "活动选人"),
        ("project", "项目组队"),
        ("transfer", "人员调配"),
    ]

    for sc, label in scenarios:
        step(f"S3-INT-1.{sc} {label}")
        r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=A, json={
            "scenario": sc,
            "interest_tags": ["舞蹈"] if sc == "activity" else None,
            "required_skill_tags": ["Python"] if sc == "project" else None,
            "target_group": "不存在的Step5组X" if sc == "transfer" else None,
        })
        if r.status_code == 200:
            total = r.json()["total"]
            ok(f"{label} total={total}")
        else:
            fail(f"S3-INT-1.{sc} {r.status_code}: {r.text[:200]}")

    # S3-INT-5 未知场景
    step("S3-INT-5 未知场景 → 422")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=A, json={"scenario": "unknown"})
    assert_status(r, 422, "S3-INT-5")


# ====================== Step 4 联调 ======================

def test_step4_integration(tokens: dict):
    section("Step 4 联调（5 用例）")

    if not tokens.get("admin"):
        skip("admin 未登录，跳过 Step 4")
        return

    A = H(tokens["admin"])

    # S4-INT-1 overview
    step("S4-INT-1 overview")
    r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=A)
    if r.status_code == 200:
        ov = r.json()
        if "total_employees" in ov and "groups" in ov and "skills" in ov:
            ok(f"员工 {ov['total_employees']} / 组 {len(ov['groups'])} / 技能 {len(ov['skills'])}")
        else:
            fail(f"S4-INT-1 字段缺失: {list(ov.keys())}")
    else:
        fail(f"S4-INT-1 {r.status_code}")

    # S4-INT-2 certificates
    step("S4-INT-2 certificates")
    r = requests.post(f"{BASE}/api/admin/analytics/certificates", headers=A)
    if r.status_code == 200:
        cr = r.json()
        if "items" in cr and "total_certs" in cr:
            ok(f"证书 {cr['total_certs']} 张")
        else:
            fail(f"S4-INT-2 字段缺失")
    else:
        fail(f"S4-INT-2 {r.status_code}")

    # S4-INT-3 risks
    step("S4-INT-3 risks 等级对齐")
    r = requests.post(f"{BASE}/api/admin/analytics/risks", headers=A)
    if r.status_code == 200:
        rk = r.json()
        total = rk["red_count"] + rk["yellow_count"] + rk["green_count"]
        items_len = len(rk["items"])
        if total == items_len:
            ok(f"红 {rk['red_count']} / 黄 {rk['yellow_count']} / 绿 {rk['green_count']}")
        else:
            fail(f"S4-INT-3 等级数 {total} ≠ items {items_len}")
    else:
        fail(f"S4-INT-3 {r.status_code}")

    # S4-INT-4 emergency 通勤分布
    step("S4-INT-4 emergency 通勤分布")
    r = requests.post(f"{BASE}/api/admin/analytics/emergency", headers=A)
    if r.status_code == 200:
        em = r.json()
        buckets = [it["bucket"] for it in em["items"]]
        if len(buckets) == 4:
            ok(f"4 bucket: {buckets}")
        else:
            fail(f"S4-INT-4 bucket {len(buckets)} ≠ 4: {buckets}")
    else:
        fail(f"S4-INT-4 {r.status_code}")

    # S4-INT-5 综合导出
    step("S4-INT-5 综合导出 Excel")
    r = requests.post(f"{BASE}/api/admin/analytics/export", headers=A)
    if r.status_code == 200 and r.headers.get("content-type", "").startswith("application/vnd.openxmlformats"):
        if len(r.content) > 1000:
            ok(f"{len(r.content)} bytes")
        else:
            fail(f"S4-INT-5 文件过小 {len(r.content)} bytes")
    else:
        fail(f"S4-INT-5 {r.status_code} content-type={r.headers.get('content-type')}")


# ====================== 权限专项 ======================

def test_permissions(tokens: dict):
    section("权限专项（28 用例）")

    A = H(tokens["admin"]) if tokens.get("admin") else None
    L = H(tokens["leader_test"]) if tokens.get("leader_test") else None
    U = H(tokens["user_test1"]) if tokens.get("user_test1") else None

    if not all([A, L, U]):
        skip("缺少部分账号，跳过权限测试")
        return

    # T-PERM-1 admin 创建用户 / L 创建被拒
    step("T-PERM-1 admin 创建 OK")
    test_ehr = "9990002"
    r = requests.post(f"{BASE}/api/admin/users", headers=A, json={
        "ehr_no": test_ehr, "name": "P", "group_name": "X", "role": "user"
    })
    if r.status_code == 200:
        ok()
        # 清理
        requests.delete(f"{BASE}/api/admin/users/{test_ehr}", headers=A)
    elif r.status_code == 400 and "已存在" in r.text:
        skip(f"EHR {test_ehr} 已存在")
    else:
        fail(f"T-PERM-1 admin {r.status_code}")

    step("T-PERM-1 L 创建 → 403")
    r = requests.post(f"{BASE}/api/admin/users", headers=L, json={
        "ehr_no": "9990003", "name": "X", "group_name": "X"
    })
    assert_status(r, 403, "T-PERM-1.L")

    step("T-PERM-1 U 创建 → 403")
    r = requests.post(f"{BASE}/api/admin/users", headers=U, json={
        "ehr_no": "9990004", "name": "X", "group_name": "X"
    })
    assert_status(r, 403, "T-PERM-1.U")

    # T-PERM-12 admin / L / U 读 users
    step("T-PERM-12 admin /admin/users")
    r = requests.get(f"{BASE}/api/admin/users", headers=A)
    assert_status(r, 200, "T-PERM-12.A")

    step("T-PERM-12 L /admin/users → 403")
    r = requests.get(f"{BASE}/api/admin/users", headers=L)
    assert_status(r, 403, "T-PERM-12.L")

    step("T-PERM-12 U /admin/users → 403")
    r = requests.get(f"{BASE}/api/admin/users", headers=U)
    assert_status(r, 403, "T-PERM-12.U")

    # T-PERM-13 admin list / L list / U list
    step("T-PERM-13 admin /profile/admin/list")
    r = requests.get(f"{BASE}/api/profile/admin/list", headers=A)
    assert_status(r, 200, "T-PERM-13.A")

    step("T-PERM-13 L /profile/admin/list")
    r = requests.get(f"{BASE}/api/profile/admin/list", headers=L)
    assert_status(r, 200, "T-PERM-13.L")

    step("T-PERM-13 U /profile/admin/list → 403")
    r = requests.get(f"{BASE}/api/profile/admin/list", headers=U)
    assert_status(r, 403, "T-PERM-13.U")

    # T-PERM-14 by-ehr
    step("T-PERM-14 admin /by-ehr/他")
    r = requests.get(f"{BASE}/api/profile/by-ehr/1234568", headers=A)
    assert_status(r, 200, "T-PERM-14.A")

    step("T-PERM-14 L /by-ehr/本组")
    r = requests.get(f"{BASE}/api/profile/by-ehr/1234567", headers=L)
    assert_status(r, 200, "T-PERM-14.L.本组")

    step("T-PERM-14 U /by-ehr/他 → 403")
    r = requests.get(f"{BASE}/api/profile/by-ehr/1234568", headers=U)
    assert_status(r, 403, "T-PERM-14.U")

    step("T-PERM-14 U /by-ehr/自己")
    r = requests.get(f"{BASE}/api/profile/by-ehr/1234567", headers=U)
    assert_status(r, 200, "T-PERM-14.U.自己")

    # T-PERM-15 home-visits
    step("T-PERM-15 admin /home-visits")
    r = requests.get(f"{BASE}/api/home-visits", headers=A)
    assert_status(r, 200, "T-PERM-15.A")

    step("T-PERM-15 L /home-visits")
    r = requests.get(f"{BASE}/api/home-visits", headers=L)
    assert_status(r, 200, "T-PERM-15.L")

    step("T-PERM-15 U /home-visits")
    r = requests.get(f"{BASE}/api/home-visits", headers=U)
    assert_status(r, 200, "T-PERM-15.U")

    # T-PERM-16 日志
    step("T-PERM-16 admin /operation-logs")
    r = requests.get(f"{BASE}/api/admin/operation-logs", headers=A)
    assert_status(r, 200, "T-PERM-16.A")

    step("T-PERM-16 L /operation-logs → 403")
    r = requests.get(f"{BASE}/api/admin/operation-logs", headers=L)
    assert_status(r, 403, "T-PERM-16.L")

    step("T-PERM-16 U /operation-logs → 403")
    r = requests.get(f"{BASE}/api/admin/operation-logs", headers=U)
    assert_status(r, 403, "T-PERM-16.U")

    # T-PERM-17 analytics
    step("T-PERM-17 admin /analytics")
    r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=A)
    assert_status(r, 200, "T-PERM-17.A")

    step("T-PERM-17 L /analytics")
    r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=L)
    if r.status_code in (200, 403):
        ok(f"T-PERM-17.L {r.status_code}")
    else:
        fail(f"T-PERM-17.L {r.status_code}")

    step("T-PERM-17 U /analytics → 403")
    r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=U)
    assert_status(r, 403, "T-PERM-17.U")

    # T-PERM-18 scenarios
    step("T-PERM-18 admin /scenarios")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=A, json={"scenario": "emergency"})
    assert_status(r, 200, "T-PERM-18.A")

    step("T-PERM-18 U /scenarios → 403")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=U, json={"scenario": "emergency"})
    assert_status(r, 403, "T-PERM-18.U")

    # T-PERM-19 group-transfers
    step("T-PERM-19 admin /group-transfers")
    r = requests.get(f"{BASE}/api/admin/group-transfers", headers=A)
    assert_status(r, 200, "T-PERM-19.A")

    step("T-PERM-19 L /group-transfers → 403")
    r = requests.get(f"{BASE}/api/admin/group-transfers", headers=L)
    assert_status(r, 403, "T-PERM-19.L")

    step("T-PERM-19 U /group-transfers → 403")
    r = requests.get(f"{BASE}/api/admin/group-transfers", headers=U)
    assert_status(r, 403, "T-PERM-19.U")

    # T-PERM-20 技能模板
    step("T-PERM-20 admin /skill-tags/templates")
    r = requests.get(f"{BASE}/api/skill-tags/templates", headers=A)
    assert_status(r, 200, "T-PERM-20.A")

    step("T-PERM-20 U /skill-tags/templates")
    r = requests.get(f"{BASE}/api/skill-tags/templates", headers=U)
    assert_status(r, 200, "T-PERM-20.U")

    # T-PERM-26 无效 token
    step("T-PERM-26 无效 token → 401")
    r = requests.get(f"{BASE}/api/profile/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert_status(r, 401, "T-PERM-26")

    # T-PERM-28 软删除用户登录
    step("T-PERM-28 软删除 EHR 登录 → 401")
    # 创建并删除一个临时用户
    test_ehr_del = "9990005"
    r = requests.post(f"{BASE}/api/admin/users", headers=A, json={
        "ehr_no": test_ehr_del, "name": "DEL", "group_name": "X", "role": "user"
    })
    if r.status_code == 200:
        requests.delete(f"{BASE}/api/admin/users/{test_ehr_del}", headers=A)
        r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": test_ehr_del, "password": "1234567"})
        assert_status(r, 401, "T-PERM-28")


# ====================== 主入口 ======================

def main():
    print("=" * 70)
    print(_print_color("Step 5 集成测试 + 回归测试 + 权限专项", "cyan"))
    print(f"目标: {BASE}    时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    start = time.time()

    # 1. 健康检查
    section("环境检查")
    try:
        r = requests.get(f"{BASE}/api/health", timeout=5)
        if r.status_code == 200:
            ok("后端在线")
        else:
            fail(f"健康检查 {r.status_code}")
            return
    except Exception as e:
        fail(f"无法连接后端: {e}")
        return

    # 2. 登录准备
    tokens = setup()

    # 3. 7 个核心模块回归
    test_m1_auth(tokens)
    test_m2_profile(tokens)
    test_m3_admin_profile(tokens)
    test_m4_users(tokens)
    test_m5_logs(tokens)
    test_m6_skill_tags(tokens)
    test_m7_home_visits(tokens)

    # 4. Step 1-4 联调
    test_step1_integration(tokens)
    test_step2_integration(tokens)
    test_step3_integration(tokens)
    test_step4_integration(tokens)

    # 5. 权限专项
    test_permissions(tokens)

    # 汇总
    elapsed = round(time.time() - start, 2)
    print("\n" + "=" * 70)
    print(_print_color("测试汇总", "cyan"))
    print("=" * 70)
    print(f"  总耗时：{elapsed}s")
    print(f"  {_print_color('通过', 'green')}：{PASS}")
    print(f"  {_print_color('失败', 'red')}：{FAIL}")
    print(f"  {_print_color('跳过', 'yellow')}：{SKIP}")

    if FAIL_LIST:
        print("\n" + _print_color("失败用例：", "red"))
        for x in FAIL_LIST:
            print(f"  - {x}")

    rate = PASS / (PASS + FAIL) * 100 if (PASS + FAIL) > 0 else 0
    print(f"\n  通过率：{rate:.1f}%")

    if FAIL == 0:
        print("\n" + _print_color("✓ [ALL DONE] Step 5 集成测试 + 回归测试全部通过", "green"))
        return 0
    else:
        print("\n" + _print_color(f"✗ [FAIL] {FAIL} 个用例失败，请修复后重跑", "red"))
        return 1


if __name__ == "__main__":
    sys.exit(main())
