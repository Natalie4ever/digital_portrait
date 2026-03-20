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
    const msg = Array.isArray(err.detail) && err.detail[0]?.msg
      ? err.detail[0].msg
      : (err.detail || err.message || '请求失败');
    throw new Error(msg);
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
