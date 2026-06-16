// API 请求封装：携带 token，1 小时无操作由后端 token 过期登出
const BASE = '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

/** 组长账号未配置组别时，统一提示（与后端 403 文案对应） */
export const LEADER_ASSIGN_GROUP_MESSAGE = '请联系管理分配组别';

function normalizeErrorDetail(errBody) {
  const d = errBody?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return errBody?.message || '请求失败';
}

function normalizeErrorMessage(msg) {
  if (typeof msg !== 'string') return String(msg);
  if (msg.includes('组长未配置有效组别') || msg.includes('未配置有效组别')) {
    return LEADER_ASSIGN_GROUP_MESSAGE;
  }
  return msg;
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(BASE + url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('登录已过期');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const raw = normalizeErrorDetail(err);
    throw new Error(normalizeErrorMessage(raw));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

// 认证
export async function checkEhr(ehr_no) {
  return api.get(`/auth/check-ehr/${encodeURIComponent(ehr_no.trim())}`);
}

export async function login(ehr_no, password) {
  const data = await api.post('/auth/login', { ehr_no, password });
  return data;
}

export async function getCurrentUser() {
  return api.get('/auth/me');
}

export async function changePassword(old_password, new_password) {
  return api.post('/auth/change-password', { old_password, new_password });
}

// 档案
export async function getProfileMe() {
  return api.get('/profile/me');
}

export async function getProfileByEhr(ehr_no) {
  return api.get(`/profile/by-ehr/${ehr_no}`);
}

export async function listProfiles(params) {
  const cleaned = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const query = new URLSearchParams(cleaned).toString();
  const qs = query ? `?${query}` : '';
  return api.get(`/profile/admin/list${qs}`);
}

export async function updateProfileBase(body) {
  return api.put('/profile/me/base', body);
}

// 子表增删改（政治面貌、学历、家庭、简历、奖惩、资格、成果、语言、通讯、技能标签）
const subPaths = {
  political: 'political',
  education: 'education',
  family: 'family',
  resume: 'resume',
  reward: 'reward',
  qualification: 'qualification',
  achievement: 'achievement',
  language: 'language',
  skillTags: 'skill-tags',
  // Step 1 1.4: 项目总结
  project_summary: 'project-summary',
};

export async function createSub(segment, body) {
  const path = subPaths[segment] || segment;
  return api.post(`/profile/me/${path}`, body);
}

export async function updateSub(segment, id, body) {
  const path = subPaths[segment] || segment;
  return api.put(`/profile/me/${path}/${id}`, body);
}

export async function deleteSub(segment, id) {
  const path = subPaths[segment] || segment;
  return api.delete(`/profile/me/${path}/${id}`);
}

// 发展意向 1:1（Step 1 1.3 修订版）
export async function getDevelopmentIntent() {
  return api.get('/profile/me/development-intent');
}

export async function saveDevelopmentIntent(body) {
  return api.put('/profile/me/development-intent', body);
}

export async function getContact() {
  return api.get('/profile/me/contact');
}

export async function upsertContact(body) {
  return api.put('/profile/me/contact', body);
}

export async function getSkillTags() {
  return api.get('/profile/me/skill-tags');
}

export async function addSkillTag(body) {
  return api.post('/profile/me/skill-tags', body);
}

export async function removeSkillTag(id) {
  return api.delete(`/profile/me/skill-tags/${id}`);
}

// 技能标签模板（预定义）
export async function listSkillTagTemplates() {
  return api.get('/skill-tags/templates');
}

export async function createSkillTagTemplate(name) {
  return api.post('/skill-tags/templates', { name });
}

export async function deleteSkillTagTemplate(id) {
  return api.delete(`/skill-tags/templates/${id}`);
}

// 管理员：用户
export async function listUsers(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api.get('/admin/users' + (q ? '?' + q : ''));
}

export async function createUser(body) {
  return api.post('/admin/users', body);
}

export async function getUser(ehr_no) {
  return api.get(`/admin/users/${ehr_no}`);
}

export async function updateUser(ehr_no, body) {
  return api.put(`/admin/users/${ehr_no}`, body);
}

export async function deleteUser(ehr_no) {
  return api.delete(`/admin/users/${ehr_no}`);
}

export async function resetPassword(ehr_no, new_password) {
  return api.post('/admin/users/reset-password', { ehr_no, new_password });
}

export async function batchImportUsers(file) {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch(BASE + '/admin/users/batch-import', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('登录已过期');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || '导入失败');
  }
  return res.json();
}

// 管理员：操作日志
export async function listOperationLogs(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api.get('/admin/operation-logs' + (q ? '?' + q : ''));
}

// 家访记录
export async function listHomeVisits(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const q = new URLSearchParams(cleaned).toString();
  return api.get('/home-visits' + (q ? '?' + q : ''));
}

export async function getHomeVisit(id) {
  return api.get(`/home-visits/${id}`);
}

export async function createHomeVisit(body) {
  return api.post('/home-visits', body);
}

export async function updateHomeVisit(id, body) {
  return api.put(`/home-visits/${id}`, body);
}

export async function deleteHomeVisit(id) {
  return api.delete(`/home-visits/${id}`);
}

// 应急先锋队（Step 1 1.1 修订：管理员/组长可标记）
export async function toggleEmergencyUser(ehr_no) {
  return api.post(`/admin/users/${encodeURIComponent(ehr_no)}/toggle-emergency`);
}

export async function toggleEmergencyProfile(ehr_no) {
  return api.post(`/profile/admin/${encodeURIComponent(ehr_no)}/toggle-emergency`);
}

// 组员调换（Step 2）
export async function transferUser(body) {
  return api.post('/admin/group-transfers/transfer', body);
}

export async function listGroupTransfers(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const q = new URLSearchParams(cleaned).toString();
  return api.get('/admin/group-transfers' + (q ? '?' + q : ''));
}

export async function getUserTransferHistory(ehr_no) {
  return api.get(`/admin/group-transfers/user/${encodeURIComponent(ehr_no)}`);
}

export async function listGroups() {
  return api.get('/admin/group-transfers/groups');
}

// Step 3: 智能筛选场景
export async function scenarioSearch(body) {
  return api.post('/admin/scenarios/search', body);
}

export async function scenarioExport(body) {
  // 导出 Excel：fetch + blob 下载
  const token = getToken();
  const res = await fetch(BASE + '/admin/scenarios/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('登录已过期');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || '导出失败');
  }
  // 解析文件名（优先用 RFC 5987 编码的中文名）
  const dispo = res.headers.get('content-disposition') || '';
  let filename = 'scenario.xlsx';
  const starMatch = dispo.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch) {
    try {
      filename = decodeURIComponent(starMatch[1]);
    } catch (e) {
      const basic = dispo.match(/filename="([^"]+)"/);
      if (basic) filename = basic[1];
    }
  } else {
    const basic = dispo.match(/filename="([^"]+)"/);
    if (basic) filename = basic[1];
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { filename };
}

// Step 4: 团队能力分析
export async function analyticsOverview() {
  return api.post('/admin/analytics/overview', {});
}

export async function analyticsCertificates() {
  return api.post('/admin/analytics/certificates', {});
}

export async function analyticsRisks() {
  return api.post('/admin/analytics/risks', {});
}

export async function analyticsEmergency() {
  return api.post('/admin/analytics/emergency', {});
}

export async function analyticsExport() {
  const token = getToken();
  const res = await fetch(BASE + '/admin/analytics/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('登录已过期');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || '导出失败');
  }
  const dispo = res.headers.get('content-disposition') || '';
  let filename = 'analytics.xlsx';
  const starMatch = dispo.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch) {
    try {
      filename = decodeURIComponent(starMatch[1]);
    } catch (e) {
      const basic = dispo.match(/filename="([^"]+)"/);
      if (basic) filename = basic[1];
    }
  } else {
    const basic = dispo.match(/filename="([^"]+)"/);
    if (basic) filename = basic[1];
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { filename };
}
