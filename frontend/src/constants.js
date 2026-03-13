// 固定选项（与后端约定一致）
export const GENDER_OPTIONS = [
  { value: '', label: '请选择' },
  { value: '男', label: '男' },
  { value: '女', label: '女' },
];

const NATIONS = [
  '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
  '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
  '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族',
  '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族',
  '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族',
  '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族', '其他',
];
export const NATION_OPTIONS = [
  { value: '', label: '请选择' },
  ...NATIONS.map((n) => ({ value: n, label: n })),
];

export const ID_TYPE_OPTIONS = [
  { value: '', label: '请选择' },
  { value: '居民身份证', label: '居民身份证' },
  { value: '护照', label: '护照' },
  { value: '其他', label: '其他' },
];

export const MARITAL_OPTIONS = [
  { value: '', label: '请选择' },
  { value: '未婚', label: '未婚' },
  { value: '已婚', label: '已婚' },
  { value: '离异', label: '离异' },
  { value: '丧偶', label: '丧偶' },
];

export const POLITICAL_OPTIONS = [
  '群众', '共青团员', '中共党员', '民主党派', '其他',
].map((n) => ({ value: n, label: n }));

export const EDUCATION_LEVEL_OPTIONS = [
  '高中及以下', '大专', '本科', '硕士', '博士', '其他',
].map((n) => ({ value: n, label: n }));

export const DEGREE_OPTIONS = [
  '无', '学士', '硕士', '博士', '其他',
].map((n) => ({ value: n, label: n }));

export const EDUCATION_TYPE_OPTIONS = [
  '全日制', '自考', '成人教育', '网络教育', '其他',
].map((n) => ({ value: n, label: n }));

export const RELATION_OPTIONS = [
  '配偶', '子女', '父亲', '母亲', '兄弟', '姐妹', '其他',
].map((n) => ({ value: n, label: n }));

export const LANGUAGE_OPTIONS = [
  '英语', '日语', '法语', '德语', '俄语', '西班牙语', '其他',
].map((n) => ({ value: n, label: n }));

export const PROFICIENCY_OPTIONS = [
  '熟练', '一般', '初级',
].map((n) => ({ value: n, label: n }));

export const ROLE_OPTIONS = [
  { value: 'user', label: '普通用户' },
  { value: 'leader', label: '组长' },
  { value: 'admin', label: '管理员' },
];
