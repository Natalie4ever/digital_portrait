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
  { value: '其他', label: '其他' },
];

export const POLITICAL_OPTIONS = [
  '群众', '共青团员', '中共党员', '民主党派', '其他',
].map((n) => ({ value: n, label: n }));

// 教育类别（学历学位用）
export const EDUCATION_CATEGORY_OPTIONS = [
  '全日制教育', '在职教育',
].map((n) => ({ value: n, label: n }));

// 教育类型（学历学位用）
export const EDUCATION_TYPE_OPTIONS_EDU = [
  '国民教育', '党校教育', '军队教育',
].map((n) => ({ value: n, label: n }));

// 学历（每层次含毕业/肄业，中专=中等专科、大专=大学专科已合并）
export const EDUCATION_LEVEL_OPTIONS = [
  '其他', '小学毕业', '小学肄业', '初中毕业', '初中肄业', '高中毕业', '高中肄业',
  '技工学校毕业', '技工学校肄业', '中等专科毕业', '中等专科肄业', '大学专科毕业', '大学专科肄业',
  '本科毕业', '本科肄业', '硕士研究生毕业', '硕士研究生肄业', '博士研究生毕业', '博士研究生肄业',
].map((n) => ({ value: n, label: n }));

// 学位（学历学位用）
export const DEGREE_OPTIONS = [
  '其他', '学士', '硕士', '博士', '名誉博士',
].map((n) => ({ value: n, label: n }));

// 原教育类别/类型（若其他模块仍用可保留别名）
export const EDUCATION_TYPE_OPTIONS = [
  '全日制', '自考', '成人教育', '网络教育', '其他',
].map((n) => ({ value: n, label: n }));

// 学习完成情况（学历学位用）
export const COMPLETION_STATUS_OPTIONS = [
  '毕业', '肄业', '结业', '其他',
].map((n) => ({ value: n, label: n }));

// 学历授予国家（地区）
export const COUNTRY_OPTIONS = [
  '中国', '美国', '英国', '日本', '德国', '法国', '澳大利亚', '加拿大', '其他',
].map((n) => ({ value: n, label: n }));

// 与本人关系（基础信息等用）
export const RELATION_OPTIONS = [
  '配偶', '子女', '父亲', '母亲', '兄弟', '姐妹', '其他',
].map((n) => ({ value: n, label: n }));

// 亲属与本人关系（配偶、子女及主要社会关系用）
export const FAMILY_RELATION_OPTIONS = [
  '父亲', '母亲', '丈夫', '妻子', '儿子', '养子或继子', '女儿', '养女或继女',
].map((n) => ({ value: n, label: n }));

// 人员状况（配偶、子女及主要社会关系用）
export const EMPLOYMENT_STATUS_OPTIONS = [
  '学前', '上学', '在业', '无业', '离退', '已故', '烈士', '不详',
].map((n) => ({ value: n, label: n }));

// 奖惩类型（奖惩信息用）
export const REWARD_TYPE_OPTIONS = [
  { value: '奖励', label: '奖励' },
  { value: '惩罚', label: '惩罚' },
];

export const LANGUAGE_OPTIONS = [
  '英语', '日语', '法语', '德语', '俄语', '西班牙语', '其他',
].map((n) => ({ value: n, label: n }));

export const PROFICIENCY_OPTIONS = [
  '精通', '熟练', '良好', '一般',
].map((n) => ({ value: n, label: n }));

export const ROLE_OPTIONS = [
  { value: 'user', label: '普通用户' },
  { value: 'leader', label: '组长' },
  { value: 'admin', label: '管理员' },
];
