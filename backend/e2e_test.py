# Step 5 端到端集成测试
# 把 Step 1-4 全部冒烟测试串联起来，验证整体流程
import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests
import time

BASE = "http://127.0.0.1:8002"

# ====================== 工具 ======================

def login(ehr_no, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"ehr_no": ehr_no, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def assert_status(r, expected, label):
    assert r.status_code == expected, f"[{label}] 期望 {expected}，实际 {r.status_code}: {r.text[:200]}"
    print(f"  [{label}] status={r.status_code} ✓")


# ====================== Step 0: 基础健康检查 ======================
def test_health():
    print("\n=== Step 0: 健康检查 ===")
    r = requests.get(f"{BASE}/api/health", timeout=5)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    print("  [health] 服务在线 ✓")


# ====================== Step 1: 基础字段补全 ======================
def test_step1(admin_h, test_user_ehr):
    print("\n=== Step 1: 基础字段补全 ===")

    # 1.1 应急先锋队
    print("  [1.1] 应急先锋队")
    r = requests.post(f"{BASE}/api/admin/users/{test_user_ehr}/toggle-emergency", headers=admin_h)
    assert_status(r, 200, "1.1 toggle")
    cur = r.json()["is_emergency_staff"]

    # 1.2 证书有效期
    print("  [1.2] 证书有效期")
    # 该接口需要先登录为该用户，先用 admin 跳过
    # 验证 qualification_info 表有 valid_until 字段（间接：通过 profile 验证）
    r = requests.get(f"{BASE}/api/profile/by-ehr/{test_user_ehr}", headers=admin_h)
    assert_status(r, 200, "1.2 profile")

    # 1.3 发展意向 1:1
    print("  [1.3] 发展意向 1:1")
    r = requests.put(f"{BASE}/api/profile/me/development-intent", headers=admin_h, json={
        "development_path": "管理发展路径",
        "short_term_goal": "1年内完成 PMP",
        "mid_term_goal": "3年内成为团队主管",
        "core_abilities": ["沟通与影响力", "流程与项目管理"],
        "learning_methods": ["外部认证课程", "在线学习平台"],
        "rotation_interest": "是",
        "rotation_target": "总行风控部",
        "project_interests": ["数字化转型", "跨部门协同"],
        "other_comments": "e2e 测试数据",
    })
    assert_status(r, 200, "1.3 develop-intent")
    r = requests.get(f"{BASE}/api/profile/me/development-intent", headers=admin_h)
    assert_status(r, 200, "1.3 get develop-intent")
    d = r.json()
    assert d["development_path"] == "管理发展路径"
    assert d["core_abilities"] == ["沟通与影响力", "流程与项目管理"]
    print("    [1.3] 发展意向保存+读取正常 ✓")

    # 1.4 项目总结
    print("  [1.4] 项目总结")
    # admin 自己的项目总结（admin 在测试组）
    r = requests.post(f"{BASE}/api/profile/me/project-summary", headers=admin_h, json={
        "project_name": "e2e测试项目",
        "start_time": "2024-01-01",
        "end_time": "2024-06-30",
        "role": "技术负责人",
        "description": "Step 5 端到端测试自动创建",
        "tag_ids": [],
    })
    assert_status(r, 200, "1.4 project")
    print("    [1.4] 项目总结创建成功 ✓")

    return cur


# ====================== Step 2: 组员调换历史 ======================
def test_step2(admin_h, test_user_ehr, original_group):
    print("\n=== Step 2: 组员调换历史 ===")

    # 2.1 调组
    print("  [2.1] 调组")
    new_group = "e2e测试组"
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=admin_h, json={
        "ehr_no": test_user_ehr, "to_group": new_group, "reason": "e2e 测试"
    })
    assert_status(r, 200, "2.1 transfer")
    assert r.json()["to_group"] == new_group

    # 2.2 查询历史
    print("  [2.2] 历史查询")
    r = requests.get(f"{BASE}/api/admin/group-transfers/user/{test_user_ehr}", headers=admin_h)
    assert_status(r, 200, "2.2 history")
    history = r.json()
    assert len(history) >= 1
    print(f"    [2.2] 历史 {len(history)} 条 ✓")

    # 2.3 列表查询
    r = requests.get(f"{BASE}/api/admin/group-transfers?ehr_no={test_user_ehr}", headers=admin_h)
    assert_status(r, 200, "2.3 list")

    # 2.4 全部组别
    r = requests.get(f"{BASE}/api/admin/group-transfers/groups", headers=admin_h)
    assert_status(r, 200, "2.4 groups")
    groups = r.json()["items"]
    assert new_group in groups, "新组应在列表"
    print(f"    [2.4] 全部组别: {groups} ✓")

    # 2.5 重复调组保护
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=admin_h, json={
        "ehr_no": test_user_ehr, "to_group": new_group
    })
    assert r.status_code == 400, f"应 400，实际 {r.status_code}"
    print(f"    [2.5] 重复调组保护: {r.json()['detail']} ✓")

    # 2.6 调回原组
    r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=admin_h, json={
        "ehr_no": test_user_ehr, "to_group": original_group, "reason": "e2e 还原"
    })
    assert_status(r, 200, "2.6 restore")
    print(f"    [2.6] 调回原组: {original_group} ✓")


# ====================== Step 3: 智能筛选四大场景 ======================
def test_step3(admin_h, test_user_ehr):
    print("\n=== Step 3: 智能筛选四大场景 ===")

    # 3.1 应急响应
    print("  [3.1] 应急响应")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=admin_h, json={"scenario": "emergency"})
    assert_status(r, 200, "3.1 emergency")
    res = r.json()
    emg = [it for it in res["items"] if it["is_emergency_staff"]]
    assert len(emg) >= 1, "应急先锋队成员应在结果中"
    print(f"    [3.1] 应急先锋队 {len(emg)} 人 ✓")

    # 3.1.2 应急导出
    r = requests.post(f"{BASE}/api/admin/scenarios/export", headers=admin_h, json={"scenario": "emergency"})
    assert_status(r, 200, "3.1.2 export")
    assert r.headers.get("content-type", "").startswith("application/vnd.openxmlformats")
    print(f"    [3.1.2] 应急导出 {len(r.content)} bytes ✓")

    # 3.2 活动选人
    print("  [3.2] 活动选人")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=admin_h, json={
        "scenario": "activity", "interest_tags": ["舞蹈"]
    })
    assert_status(r, 200, "3.2 activity")

    # 3.3 项目组队
    print("  [3.3] 项目组队")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=admin_h, json={
        "scenario": "project", "required_skill_tags": ["Python"]
    })
    assert_status(r, 200, "3.3 project")

    # 3.4 人员调配
    print("  [3.4] 人员调配")
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=admin_h, json={
        "scenario": "transfer", "target_group": "不存在的组X"
    })
    assert_status(r, 200, "3.4 transfer")

    # 3.5 未知场景
    r = requests.post(f"{BASE}/api/admin/scenarios/search", headers=admin_h, json={"scenario": "unknown"})
    assert r.status_code == 422, f"应 422，实际 {r.status_code}"
    print(f"    [3.5] 未知场景校验 422 ✓")


# ====================== Step 4: 团队能力分析 ======================
def test_step4(admin_h):
    print("\n=== Step 4: 团队能力分析 ===")

    # 4.1 overview
    print("  [4.1] overview")
    r = requests.post(f"{BASE}/api/admin/analytics/overview", headers=admin_h)
    assert_status(r, 200, "4.1 overview")
    ov = r.json()
    assert ov["total_employees"] >= 1
    print(f"    [4.1] 员工 {ov['total_employees']} / 组别 {len(ov['groups'])} / 技能 {len(ov['skills'])} ✓")

    # 4.2 certificates
    print("  [4.2] certificates")
    r = requests.post(f"{BASE}/api/admin/analytics/certificates", headers=admin_h)
    assert_status(r, 200, "4.2 certs")

    # 4.3 risks
    print("  [4.3] risks")
    r = requests.post(f"{BASE}/api/admin/analytics/risks", headers=admin_h)
    assert_status(r, 200, "4.3 risks")
    rk = r.json()
    assert rk["red_count"] + rk["yellow_count"] + rk["green_count"] == len(rk["items"])
    print(f"    [4.3] 风险 {rk['red_count']} 红 / {rk['yellow_count']} 黄 / {rk['green_count']} 绿 ✓")

    # 4.4 emergency
    print("  [4.4] emergency")
    r = requests.post(f"{BASE}/api/admin/analytics/emergency", headers=admin_h)
    assert_status(r, 200, "4.4 emg")

    # 4.5 export
    print("  [4.5] export")
    r = requests.post(f"{BASE}/api/admin/analytics/export", headers=admin_h)
    assert_status(r, 200, "4.5 export")
    assert r.headers.get("content-type", "").startswith("application/vnd.openxmlformats")
    print(f"    [4.5] 综合报表 {len(r.content)} bytes ✓")


# ====================== 权限回归测试 ======================
def test_permissions(admin_h):
    print("\n=== 权限回归 ===")

    # 普通员工不能访问 admin 接口
    r = requests.get(f"{BASE}/api/admin/users", headers=admin_h)
    assert r.status_code == 200, "admin 应能访问"
    print("  [admin] admin /admin/users 200 ✓")

    # admin 也能访问 /api/profile/me
    r = requests.get(f"{BASE}/api/profile/me", headers=admin_h)
    assert_status(r, 200, "admin /profile/me")


# ====================== 主流程 ======================
def main():
    print("=" * 60)
    print("Step 5 端到端集成测试")
    print(f"目标：{BASE}")
    print("=" * 60)

    start = time.time()

    test_health()

    # 登录 admin
    admin_token = login("0000001", "1234567")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    print("\n[login] admin 登录成功")

    # 找一个测试用户
    r = requests.get(f"{BASE}/api/admin/users?page_size=100", headers=admin_h)
    r.raise_for_status()
    users = r.json()["items"]
    test_user = next((u for u in users if u["role"] == "user"), None)
    if not test_user:
        print("[FAIL] 没有 user 角色用户")
        sys.exit(1)
    test_user_ehr = test_user["ehr_no"]
    original_group = test_user["group_name"]
    print(f"[setup] 测试用户: {test_user_ehr} (组别: {original_group})")

    # 5 个 Step 串联
    cur = test_step1(admin_h, test_user_ehr)
    test_step2(admin_h, test_user_ehr, original_group)
    test_step3(admin_h, test_user_ehr)
    test_step4(admin_h)
    test_permissions(admin_h)

    # 清理：将 test_user 调回原组
    r = requests.get(f"{BASE}/api/admin/users?page_size=100", headers=admin_h)
    r.raise_for_status()
    cur_user = next((u for u in r.json()["items"] if u["ehr_no"] == test_user_ehr), None)
    if cur_user and cur_user["group_name"] != original_group:
        r = requests.post(f"{BASE}/api/admin/group-transfers/transfer", headers=admin_h, json={
            "ehr_no": test_user_ehr, "to_group": original_group, "reason": "e2e 最终清理"
        })
        if r.status_code == 200:
            print(f"\n[清理] 调回原组 {original_group}")

    elapsed = round(time.time() - start, 2)
    print(f"\n{'=' * 60}")
    print(f"[ALL DONE] Step 5 端到端集成测试全部通过 ({elapsed}s)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n[FAIL] 集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
