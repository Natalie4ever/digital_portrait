"""
Step 1 冒烟测试：T1.1 - T1.6 + 8 子表回归
- 前置：uvicorn 已在 127.0.0.1:8000 启动；digital_portrait.db 已重置
- 用例来源：docs/分步实施计划-暨测试安排.md 测试#1
"""
import json
import sys
import urllib.request
import urllib.error
from urllib.parse import urlencode

BASE = "http://127.0.0.1:8000/api"
ADMIN_EHR = "0000001"
ADMIN_PWD = "1234567"


class HttpResp:
    def __init__(self, status, body):
        self.status_code = status
        self._body = body

    def json(self):
        if not self._body:
            return {}
        return json.loads(self._body)

    @property
    def text(self):
        return self._body


def request(method, url, headers=None, data=None, params=None):
    if params:
        url = f"{url}?{urlencode(params)}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    if body is not None and "Content-Type" not in req.headers:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return HttpResp(resp.status, resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return HttpResp(e.code, e.read().decode("utf-8", errors="ignore"))


def login(ehr, pwd):
    r = request("POST", f"{BASE}/auth/login", data={"ehr_no": ehr, "password": pwd})
    assert r.status_code == 200, f"登录失败 {r.status_code}: {r.text}"
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def assert_ok(name, r, expect=200):
    if r.status_code != expect:
        print(f"  [FAIL] {name} HTTP {r.status_code}, body={r.text[:200]}")
        return False
    return True


def main():
    print("=" * 60)
    print("Step 1 Smoke Test: T1.1 - T1.6 + 8 sub-table regression")
    print("=" * 60)

    print("\n[Login] admin ehr=0000001")
    token = login(ADMIN_EHR, ADMIN_PWD)
    H = auth(token)
    print("  [OK] token acquired")

    # ===== T1.1 =====
    print("\n[T1.1] Emergency staff switch")
    r = request("PUT", f"{BASE}/profile/me/base", headers=H, data={"is_emergency_staff": True})
    assert_ok("T1.1 enable", r)
    r = request("GET", f"{BASE}/profile/me", headers=H)
    assert r.json()["base"]["is_emergency_staff"] is True, "is_emergency_staff not updated"
    print("  [OK] Emergency staff enabled, profile shows correctly")
    r = request("PUT", f"{BASE}/profile/me/base", headers=H, data={"is_emergency_staff": False})
    assert_ok("T1.1 disable", r)

    # ===== T1.2 =====
    print("\n[T1.2] Qualification valid_until")
    r = request("POST", f"{BASE}/profile/me/qualification", headers=H, data={
        "qualification_name": "Software Designer",
        "obtain_time": "2024-01-15",
        "valid_until": "2027-01-15",
    })
    assert_ok("T1.2 create cert with valid_until", r)
    qual_id = r.json()["id"]
    print(f"  [OK] Cert id={qual_id} created with valid_until")
    r = request("GET", f"{BASE}/profile/me", headers=H)
    quals = r.json()["qualification"]
    assert any(q["valid_until"] == "2027-01-15" for q in quals), "valid_until not stored"
    print("  [OK] List shows valid_until correctly")
    request("DELETE", f"{BASE}/profile/me/qualification/{qual_id}", headers=H)

    # ===== T1.3 =====
    print("\n[T1.3] Development intent (3 sub-tables)")
    r = request("POST", f"{BASE}/profile/me/development-position", headers=H, data={
        "position_name": "Technical",
        "status": "ongoing",
        "target_time": "2027-06-30",
        "note": "Aim to become tech lead in 2 years",
    })
    assert_ok("T1.3 development-position create", r)
    pos_id = r.json()["id"]
    r = request("POST", f"{BASE}/profile/me/development-direction", headers=H, data={
        "direction_name": "Technical Capability",
        "status": "ongoing",
        "target_time": "2027-12-31",
    })
    assert_ok("T1.3 development-direction create", r)
    dir_id = r.json()["id"]
    r = request("POST", f"{BASE}/profile/me/development-plan", headers=H, data={
        "plan_content": "Become team tech lead in 3 years",
        "status": "planned",
        "target_time": "2028-12-31",
    })
    assert_ok("T1.3 development-plan create", r)
    plan_id = r.json()["id"]
    r = request("GET", f"{BASE}/profile/me", headers=H)
    p = r.json()
    assert len(p["development_positions"]) == 1, f"position should be 1, got {len(p['development_positions'])}"
    assert len(p["development_directions"]) == 1, "direction should be 1"
    assert len(p["development_plans"]) == 1, "plan should be 1"
    print("  [OK] 3 sub-tables each with 1 record, list correct")
    request("DELETE", f"{BASE}/profile/me/development-plan/{plan_id}", headers=H)
    r = request("GET", f"{BASE}/profile/me", headers=H)
    assert len(r.json()["development_plans"]) == 0, "plan delete not effective"
    print("  [OK] After deleting plan, list empty")

    # ===== T1.4 =====
    print("\n[T1.4] Project summary + skill tag association")
    request("POST", f"{BASE}/skill-tags/templates", headers=H, data={"name": "Python"})
    r = request("GET", f"{BASE}/skill-tags/templates", headers=H)
    tag_python = next((t for t in r.json() if t["name"] == "Python"), None)
    request("POST", f"{BASE}/skill-tags/templates", headers=H, data={"name": "DataAnalysis"})
    r = request("GET", f"{BASE}/skill-tags/templates", headers=H)
    tag_data = next((t for t in r.json() if t["name"] == "DataAnalysis"), None)
    assert tag_python and tag_data, "skill tags create failed"
    r = request("POST", f"{BASE}/profile/me/project-summary", headers=H, data={
        "project_name": "Employee Portrait System",
        "start_time": "2026-01-01",
        "end_time": "2026-06-30",
        "role": "Tech Lead",
        "description": "Develop employee digital portrait system",
        "tag_ids": [tag_python["id"], tag_data["id"]],
    })
    assert_ok("T1.4 project create with 2 tags", r)
    proj_id = r.json()["id"]
    assert len(r.json()["tag_ids"]) == 2, "tag_ids not associated"
    print(f"  [OK] Project id={proj_id} created, 2 tags associated")
    r = request("GET", f"{BASE}/profile/me", headers=H)
    projs = r.json()["project_summaries"]
    assert len(projs) == 1 and len(projs[0]["tag_ids"]) == 2, "project list or tag association wrong"
    print("  [OK] Project list shows 2 tag_ids and tag_names")
    request("DELETE", f"{BASE}/profile/me/project-summary/{proj_id}", headers=H)
    r = request("GET", f"{BASE}/profile/me", headers=H)
    assert len(r.json()["project_summaries"]) == 0, "project delete not effective"
    print("  [OK] After deleting project, list empty (cascade works)")

    # ===== T1.5 =====
    print("\n[T1.5] Permission: self edit own profile")
    r = request("PUT", f"{BASE}/profile/me/base", headers=H, data={"job_title": "Senior Engineer"})
    assert_ok("T1.5 self modify job_title", r)
    r = request("GET", f"{BASE}/profile/me", headers=H)
    assert r.json()["base"]["job_title"] == "Senior Engineer", "self edit not effective"
    print("  [OK] Self can save profile normally")

    # ===== T1.6 =====
    print("\n[T1.6] Regression: 8 existing sub-tables CRUD all OK")
    for seg in ['political', 'education', 'family', 'resume', 'reward', 'qualification', 'achievement', 'language']:
        if seg == 'political':
            body = {"political_status": "Party Member", "join_date": "2020-05-01", "introducer": "Zhang San"}
        elif seg == 'education':
            body = {"education_level": "Bachelor", "school": "Tsinghua", "major_name": "CS"}
        elif seg == 'family':
            body = {"name": "Father Zhang", "relation": "Father", "gender": "Male"}
        elif seg == 'resume':
            body = {"start_time": "2020-01-01", "end_time": "2023-12-31", "unit_and_title": "XX Company Engineer"}
        elif seg == 'reward':
            body = {"reward_type": "Reward", "reward_time": "2024-03-01", "reward_name": "Excellent Employee"}
        elif seg == 'qualification':
            body = {"qualification_name": "PMP", "obtain_time": "2023-06-01"}
        elif seg == 'achievement':
            body = {"achievement_name": "Tech Patent", "obtain_time": "2024-08-01"}
        elif seg == 'language':
            body = {"language": "English", "proficiency": "Proficient"}
        r = request("POST", f"{BASE}/profile/me/{seg}", headers=H, data=body)
        if not assert_ok(f"regression {seg} create", r):
            return False
    r = request("GET", f"{BASE}/profile/me", headers=H)
    p = r.json()
    for seg in ['political', 'education', 'family', 'resume', 'reward', 'qualification', 'achievement', 'language']:
        assert len(p[seg]) >= 1, f"{seg} should have at least 1"
    print("  [OK] All 8 existing sub-tables CRUD normal")

    # Cleanup
    print("\n[Cleanup test data]")
    for seg in ['political', 'education', 'family', 'resume', 'reward', 'qualification', 'achievement', 'language']:
        for item in request("GET", f"{BASE}/profile/me", headers=H).json()[seg]:
            request("DELETE", f"{BASE}/profile/me/{seg}/{item['id']}", headers=H)
    request("PUT", f"{BASE}/profile/me/base", headers=H, data={"job_title": None})
    print("  [OK] Test data cleaned")

    print("\n" + "=" * 60)
    print("[PASS] Step 1 smoke test all passed! T1.1 - T1.6 all OK")
    print("=" * 60)
    return True


if __name__ == "__main__":
    try:
        ok = main()
        sys.exit(0 if ok else 1)
    except AssertionError as e:
        print(f"\n[FAIL] Assertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
