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

// Step 1 1.3（修订版）: 发展意向字典 - 4 个部分
export const DEVELOPMENT_PATH_OPTIONS = [
  { value: '专业深耕路径', label: '专业深耕路径（成为领域专家/资深人士）' },
  { value: '管理发展路径', label: '管理发展路径（团队主管/部门负责人）' },
  { value: '横向拓展路径', label: '横向拓展路径（复合型人才）' },
  { value: '项目/创新路径', label: '项目/创新路径（项目负责人/技术创新）' },
].map((o) => ({ value: o.value, label: o.label }));

export const CORE_ABILITY_OPTIONS = [
  { value: '专业硬技能', label: '专业硬技能（如：Python/SQL数据分析、监管政策深度解读、新核心系统运维、财务建模等）' },
  { value: '流程与项目管理', label: '流程与项目管理（如：精益六西格玛、敏捷项目管理、复杂项目协调）' },
  { value: '沟通与影响力', label: '沟通与影响力（如：跨部门高效沟通、向上汇报、方案说服）' },
  { value: '创新与问题解决', label: '创新与问题解决（如：设计思维、复杂问题分析与解决）' },
  { value: '团队协作与指导', label: '团队协作与指导（如：辅导新人、虚拟团队协作）' },
].map((o) => ({ value: o.value, label: o.label }));

export const LEARNING_METHOD_OPTIONS = [
  { value: '行内专业培训', label: '行内专业培训' },
  { value: '外部认证课程', label: '外部认证课程（如：PMP、CFA、CISA等）' },
  { value: '在线学习平台', label: '在线学习平台课程' },
  { value: '书籍资料自学', label: '书籍/资料自学' },
  { value: '师徒制', label: '"师徒制"跟随资深同事学习' },
  { value: '行业研讨会', label: '参与行业研讨会/论坛' },
].map((o) => ({ value: o.value, label: o.label }));

export const PROJECT_INTEREST_OPTIONS = [
  { value: '数字化转型', label: '数字化转型项目（如：RPA流程自动化、数据中台建设）' },
  { value: '系统升级运维', label: '重大系统升级或运维项目' },
  { value: '流程优化', label: '关键业务流程优化或重构项目' },
  { value: '跨部门协同', label: '跨部门协同攻坚项目' },
  { value: '创新课题', label: '创新课题研究项目' },
].map((o) => ({ value: o.value, label: o.label }));

export const ROTATION_INTEREST_OPTIONS = [
  { value: '是', label: '是，愿意尝试短期轮岗或借调' },
  { value: '否', label: '否，希望专注当前领域' },
].map((o) => ({ value: o.value, label: o.label }));

// Step 1 1.4: 项目总结字典
export const PROJECT_ROLE_OPTIONS = [
  { value: '项目经理', label: '项目经理' },
  { value: '技术负责人', label: '技术负责人' },
  { value: '开发', label: '开发' },
  { value: '测试', label: '测试' },
  { value: '运维', label: '运维' },
  { value: '架构师', label: '架构师' },
  { value: '其他', label: '其他' },
];
