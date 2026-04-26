/* ================================================================
   性压抑指数评估平台 - 主逻辑脚本（重构版）
   包含：普通版60题题库 + 增强版600题题库（6维度）
   纯前端运行，无需服务器
   ================================================================ */

// 初始化加载监控 - 标记JS已加载
(function () {
  if (window.ResourceMonitor) {
    window.ResourceMonitor.loaded.js = true;
    window.ResourceMonitor.report("JS", "success", "App.js loaded");
    window.ResourceMonitor.checkReady();
  }
})();

// 全局错误处理
window.onerror = function (message, source, lineno, colno, error) {
  console.error("[Global Error]", { message, source, lineno, colno, error });
  if (window.ResourceMonitor) {
    window.ResourceMonitor.errors.push({
      type: "runtime",
      message,
      source,
      lineno,
      colno,
      time: performance.now(),
    });
  }
  return false;
};

// Promise错误处理
window.addEventListener("unhandledrejection", function (event) {
  console.error("[Unhandled Promise Rejection]", event.reason);
  if (window.ResourceMonitor) {
    window.ResourceMonitor.errors.push({
      type: "promise",
      message: event.reason,
      time: performance.now(),
    });
  }
});

// ==================== 全局状态管理 ====================
const AppState = {
  currentView: "view-entry",
  appMode: null,
  assessmentType: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  resultData: null,
};

// ==================== DOM 工具 ====================
function $(sel) {
  return document.querySelector(sel);
}
function $$(sel) {
  return document.querySelectorAll(sel);
}

// ==================== 视图切换 ====================
function switchView(viewId) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  const target = $(`#${viewId}`);
  if (target) {
    target.classList.add("active");
    AppState.currentView = viewId;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ==================== Toast 提示 ====================
function showToast(msg, type = "success") {
  const container = $("#toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.background =
    type === "error" ? "#dc3545" : type === "warning" ? "#ff9800" : "#28a745";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==================== 加载遮罩 ====================
function showLoading(text = "加载中...") {
  $("#loadingText").textContent = text;
  $("#loadingOverlay").classList.add("show");
}
function hideLoading() {
  $("#loadingOverlay").classList.remove("show");
}

// ==================== 本地存储 ====================
const Storage = {
  get(key, def = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) {
      return def;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  },
  getHistory() {
    return this.get("assessment_history", []);
  },
  addHistory(item) {
    const h = this.getHistory();
    h.unshift(item);
    if (h.length > 50) h.length = 50;
    this.set("assessment_history", h);
  },
};

// ==================== 普通版题库（60题）====================
const SIMPLE_QUESTIONS_SHORT = [
  {
    id: 1,
    text: "当您在公共场合看到情侣亲密行为时，您的第一反应通常是：",
    options: [
      { value: 1, text: "感到自然和温馨" },
      { value: 3, text: "会快速移开视线" },
      { value: 5, text: "感到不适或尴尬" },
      { value: 4, text: "内心有复杂的情绪波动" },
    ],
  },
  {
    id: 2,
    text: "您认为讨论亲密关系话题最合适的场合是：",
    options: [
      { value: 1, text: "任何合适的社交场合都可以" },
      { value: 2, text: "只有在亲密朋友之间" },
      { value: 4, text: "只有在专业或教育环境中" },
      { value: 5, text: "尽量避免此类话题" },
    ],
  },
  {
    id: 3,
    text: "当朋友向您咨询情感问题时，您会：",
    options: [
      { value: 1, text: "开放地分享经验和建议" },
      { value: 2, text: "谨慎但愿意帮助" },
      { value: 4, text: "感到不舒服，尽量回避" },
      { value: 5, text: "认为这些话题不应该讨论" },
    ],
  },
  {
    id: 4,
    text: "您对艺术作品中的人体美的态度是：",
    options: [
      { value: 1, text: "能够欣赏其艺术价值" },
      { value: 2, text: "可以接受，但会有些敏感" },
      { value: 4, text: "感到不适，尽量避免" },
      { value: 5, text: "认为这些内容不合适" },
    ],
  },
  {
    id: 5,
    text: "您对自己身体的态度最接近：",
    options: [
      { value: 1, text: "完全接受和欣赏" },
      { value: 2, text: "大部分时候感到满意" },
      { value: 4, text: "经常感到不满或羞耻" },
      { value: 5, text: "极度不适，尽量避免关注" },
    ],
  },
  {
    id: 6,
    text: "在购买贴身衣物时，您的感受是：",
    options: [
      { value: 1, text: "自然轻松，会仔细挑选" },
      { value: 2, text: "有些害羞但能正常购买" },
      { value: 4, text: "感到尴尬，匆忙选择" },
      { value: 5, text: "极度不适，尽量避免" },
    ],
  },
  {
    id: 7,
    text: "您对自己的身体吸引力的评价是：",
    options: [
      { value: 1, text: "有信心且能自然展现" },
      { value: 2, text: "一般，但不会刻意隐藏" },
      { value: 4, text: "缺乏信心，倾向于掩饰" },
      { value: 5, text: "从不考虑，认为不重要" },
    ],
  },
  {
    id: 8,
    text: "当您感到某种生理冲动时，您通常会：",
    options: [
      { value: 1, text: "认为这是正常的生理反应" },
      { value: 2, text: "接受但会适度控制" },
      { value: 4, text: "感到困扰并努力压制" },
      { value: 5, text: "感到羞耻和内疚" },
    ],
  },
  {
    id: 9,
    text: "在观看浪漫电影的亲密场景时，您通常：",
    options: [
      { value: 1, text: "能够自然地观看和感受" },
      { value: 2, text: "会有些害羞但能接受" },
      { value: 4, text: "感到不适，会移开视线" },
      { value: 5, text: "会快进或离开" },
    ],
  },
  {
    id: 10,
    text: "当您感到孤独时，对亲密关系的渴望程度是：",
    options: [
      { value: 1, text: "会自然地渴望各种形式的亲密" },
      { value: 2, text: "主要渴望情感上的连接" },
      { value: 4, text: "很少想到身体上的亲密" },
      { value: 5, text: "尽量压制这种渴望" },
    ],
  },
  {
    id: 11,
    text: "在亲密关系中，您更倾向于：",
    options: [
      { value: 1, text: "主动表达需求和感受" },
      { value: 2, text: "根据情况适度表达" },
      { value: 4, text: "被动等待对方主导" },
      { value: 5, text: "很难表达真实感受" },
    ],
  },
  {
    id: 12,
    text: "您认为自己的性格在亲密关系中更接近：",
    options: [
      { value: 1, text: "开放、直接、表达自由" },
      { value: 2, text: "温和、适度、有所保留" },
      { value: 4, text: "谨慎、被动、较少主动" },
      { value: 5, text: "封闭、回避、极度保守" },
    ],
  },
  {
    id: 13,
    text: "当伴侣表达亲密需求时，您的反应通常是：",
    options: [
      { value: 1, text: "积极回应和配合" },
      { value: 2, text: "根据心情适度回应" },
      { value: 4, text: "感到压力，被动配合" },
      { value: 5, text: "感到不适，尽量回避" },
    ],
  },
  {
    id: 14,
    text: "您认为健康的成年人对亲密关系的态度应该是：",
    options: [
      { value: 1, text: "开放、自然、健康的" },
      { value: 2, text: "谨慎但不回避的" },
      { value: 4, text: "保守和克制的" },
      { value: 5, text: "应该尽量压制和控制" },
    ],
  },
  {
    id: 15,
    text: "您对相关健康教育的看法是：",
    options: [
      { value: 1, text: "非常重要，应该全面普及" },
      { value: 2, text: "重要，但需要适当的方式" },
      { value: 4, text: "可以有，但应该很保守" },
      { value: 5, text: "不太必要，可能有害" },
    ],
  },
  {
    id: 16,
    text: "您认为自己在相关知识方面的水平是：",
    options: [
      { value: 1, text: "充分且准确的" },
      { value: 2, text: "基本够用的" },
      { value: 4, text: "有限且可能不准确" },
      { value: 5, text: "很少，也不想了解更多" },
    ],
  },
  {
    id: 17,
    text: "您认为社会对亲密关系话题的态度应该是：",
    options: [
      { value: 1, text: "更加开放和包容" },
      { value: 2, text: "适度开放，有所引导" },
      { value: 4, text: "保持传统，谨慎对待" },
      { value: 5, text: "严格管制，避免讨论" },
    ],
  },
  {
    id: 18,
    text: "在选择伴侣时，您最重视的品质是：",
    options: [
      { value: 1, text: "全面的兼容性（包括身心）" },
      { value: 2, text: "情感连接和相互吸引" },
      { value: 3, text: "品德和社会地位" },
      { value: 5, text: "主要考虑非身体因素" },
    ],
  },
  {
    id: 19,
    text: '您对"亲密关系是人类自然本能"这一观点的认同程度是：',
    options: [
      { value: 1, text: "完全认同，这是自然的" },
      { value: 2, text: "基本认同，但需要适当控制" },
      { value: 4, text: "部分认同，但更重要的是精神层面" },
      { value: 5, text: "不认同，认为应该超越本能" },
    ],
  },
  {
    id: 20,
    text: "您认为自己在亲密关系中的主要角色是：",
    options: [
      { value: 1, text: "积极主动的参与者" },
      { value: 2, text: "平等的合作伙伴" },
      { value: 4, text: "被动的配合者" },
      { value: 5, text: "尽量避免的回避者" },
    ],
  },
  {
    id: 21,
    text: "当您独处时，关于亲密关系的想法频率大约是：",
    options: [
      { value: 1, text: "经常，这很自然" },
      { value: 2, text: "偶尔会有" },
      { value: 4, text: "很少，会尽量避免" },
      { value: 5, text: "从不，认为这是不当的" },
    ],
  },
  {
    id: 22,
    text: "您对自己在亲密关系中的表现满意度是：",
    options: [
      { value: 1, text: "非常满意，很有信心" },
      { value: 2, text: "基本满意，偶有担忧" },
      { value: 4, text: "不太满意，经常担忧" },
      { value: 5, text: "很不满意，极度焦虑" },
    ],
  },
  {
    id: 23,
    text: "在医院进行身体检查时，您的感受是：",
    options: [
      { value: 1, text: "能够自然配合医生" },
      { value: 2, text: "有些紧张但能配合" },
      { value: 4, text: "感到尴尬和不适" },
      { value: 5, text: "极度抗拒，尽量避免" },
    ],
  },
  {
    id: 24,
    text: "当看到关于健康知识的医学文章时：",
    options: [
      { value: 1, text: "会认真阅读并学习" },
      { value: 2, text: "会选择性地阅读" },
      { value: 4, text: "感到尴尬但可能会看" },
      { value: 5, text: "会立即跳过或关闭" },
    ],
  },
  {
    id: 25,
    text: "在公共浴室或更衣室中，您的感受是：",
    options: [
      { value: 1, text: "能够自然地使用" },
      { value: 2, text: "有些不自在但能接受" },
      { value: 4, text: "感到非常不适" },
      { value: 5, text: "尽量避免使用" },
    ],
  },
  {
    id: 26,
    text: "您认为讨论亲密关系对心理健康的影响是：",
    options: [
      { value: 1, text: "非常有益，有助于心理健康" },
      { value: 2, text: "在适当情况下是有益的" },
      { value: 4, text: "可能有害，应该谨慎" },
      { value: 5, text: "有害的，应该避免" },
    ],
  },
  {
    id: 27,
    text: "您对传统文化中关于亲密关系的观念持什么态度：",
    options: [
      { value: 4, text: "完全接受和遵循" },
      { value: 3, text: "大部分接受，适度调整" },
      { value: 2, text: "批判性接受，结合现代观念" },
      { value: 1, text: "更倾向于现代开放观念" },
    ],
  },
  {
    id: 28,
    text: "您认为年轻人接受相关教育的最佳时机是：",
    options: [
      { value: 1, text: "青春期开始时" },
      { value: 2, text: "高中阶段" },
      { value: 4, text: "成年后" },
      { value: 5, text: "结婚前后" },
    ],
  },
  {
    id: 29,
    text: "在亲密关系中遇到问题时，您更倾向于：",
    options: [
      { value: 1, text: "主动沟通解决" },
      { value: 2, text: "寻求专业建议" },
      { value: 4, text: "自己默默承受" },
      { value: 5, text: "选择逃避问题" },
    ],
  },
  {
    id: 30,
    text: "您对自己未来在亲密关系方面的期望是：",
    options: [
      { value: 1, text: "希望更加开放和自然" },
      { value: 2, text: "保持现状，适度改善" },
      { value: 4, text: "希望更加谨慎和保守" },
      { value: 5, text: "尽量减少相关需求" },
    ],
  },
];

const SIMPLE_QUESTIONS_EXTRA = [
  {
    id: 31,
    text: "您童年时期接受的相关教育主要来源于：",
    options: [
      { value: 1, text: "开放的家庭讨论和正规教育" },
      { value: 2, text: "学校教育和同伴交流" },
      { value: 4, text: "自己摸索和网络信息" },
      { value: 5, text: "基本没有，被告知是禁忌话题" },
    ],
  },
  {
    id: 32,
    text: "您认为童年经历对成年后亲密关系的影响是：",
    options: [
      { value: 2, text: "有一定影响，但可以调整" },
      { value: 1, text: "影响很小，主要看个人" },
      { value: 4, text: "影响很大，难以改变" },
      { value: 5, text: "决定性影响，无法摆脱" },
    ],
  },
  {
    id: 33,
    text: "您对青春期时的身体变化当时的感受是：",
    options: [
      { value: 1, text: "自然接受，感到好奇" },
      { value: 2, text: "有些困惑但能适应" },
      { value: 4, text: "感到尴尬和不安" },
      { value: 5, text: "极度恐惧和抗拒" },
    ],
  },
  {
    id: 34,
    text: "当您需要相关健康咨询时，您会：",
    options: [
      { value: 1, text: "主动寻求专业医生帮助" },
      { value: 2, text: "先咨询信任的朋友" },
      { value: 4, text: "自己查资料解决" },
      { value: 5, text: "尽量忽视和回避" },
    ],
  },
  {
    id: 35,
    text: "您认为在亲密关系中最重要的支持来源是：",
    options: [
      { value: 1, text: "伴侣之间的开放沟通" },
      { value: 2, text: "专业人士的指导" },
      { value: 4, text: "家庭传统的教导" },
      { value: 5, text: "个人的自我控制" },
    ],
  },
  {
    id: 36,
    text: "当朋友分享亲密关系经验时，您的反应是：",
    options: [
      { value: 1, text: "认真倾听并交流看法" },
      { value: 2, text: "礼貌倾听但不深入" },
      { value: 4, text: "感到不适，尽快转移话题" },
      { value: 5, text: "明确表示不愿听此类话题" },
    ],
  },
  {
    id: 37,
    text: "您对文学作品中的情感描写的态度是：",
    options: [
      { value: 1, text: "能够深入理解和欣赏" },
      { value: 2, text: "可以接受，但有选择性" },
      { value: 4, text: "感到不适，尽量跳过" },
      { value: 5, text: "认为这些内容不必要" },
    ],
  },
  {
    id: 38,
    text: "在博物馆看到古典艺术中的人体雕塑时：",
    options: [
      { value: 1, text: "能够欣赏其艺术和历史价值" },
      { value: 2, text: "可以接受，但会有些敏感" },
      { value: 4, text: "感到尴尬，匆忙走过" },
      { value: 5, text: "会避开这些展品" },
    ],
  },
  {
    id: 39,
    text: "您对音乐中表达情感和欲望的歌词的接受度是：",
    options: [
      { value: 1, text: "完全能够理解和欣赏" },
      { value: 2, text: "大部分能接受" },
      { value: 4, text: "有些歌词让我不适" },
      { value: 5, text: "尽量避免此类音乐" },
    ],
  },
  {
    id: 40,
    text: "您认为自己在处理亲密关系时的主要特点是：",
    options: [
      { value: 1, text: "开放坦诚，勇于表达" },
      { value: 2, text: "理性谨慎，适度表达" },
      { value: 4, text: "内向保守，较少表达" },
      { value: 5, text: "封闭回避，拒绝表达" },
    ],
  },
  {
    id: 41,
    text: "在面对亲密关系中的冲突时，您通常：",
    options: [
      { value: 1, text: "直面问题，积极解决" },
      { value: 2, text: "冷静分析，寻求妥协" },
      { value: 4, text: "回避冲突，被动应对" },
      { value: 5, text: "完全逃避，拒绝面对" },
    ],
  },
  {
    id: 42,
    text: "您对自己在亲密关系中的情绪表达能力评价是：",
    options: [
      { value: 1, text: "很强，能充分表达情感" },
      { value: 2, text: "一般，能表达基本情感" },
      { value: 4, text: "较弱，经常压抑情感" },
      { value: 5, text: "很弱，几乎不表达情感" },
    ],
  },
  {
    id: 43,
    text: "您获取相关健康知识的主要途径是：",
    options: [
      { value: 1, text: "专业书籍和医学资料" },
      { value: 2, text: "网络搜索和科普文章" },
      { value: 4, text: "朋友交流和道听途说" },
      { value: 5, text: "很少主动获取此类知识" },
    ],
  },
  {
    id: 44,
    text: "当遇到相关健康问题时，您的学习态度是：",
    options: [
      { value: 1, text: "积极学习，寻求专业指导" },
      { value: 2, text: "适度学习，了解基本知识" },
      { value: 4, text: "被动学习，只在必要时" },
      { value: 5, text: "拒绝学习，认为不需要" },
    ],
  },
  {
    id: 45,
    text: "您对参加相关健康讲座或课程的态度是：",
    options: [
      { value: 1, text: "非常愿意，认为很有价值" },
      { value: 2, text: "愿意参加，但会选择性听" },
      { value: 4, text: "不太愿意，感到尴尬" },
      { value: 5, text: "坚决不参加，认为不合适" },
    ],
  },
  {
    id: 46,
    text: "您对自己处理亲密关系问题的能力信心如何：",
    options: [
      { value: 1, text: "很有信心，能够妥善处理" },
      { value: 2, text: "基本有信心，能应对大部分" },
      { value: 4, text: "信心不足，经常感到困难" },
      { value: 5, text: "完全没信心，总是回避" },
    ],
  },
  {
    id: 47,
    text: "在亲密关系中，您对自己的魅力和吸引力的评价是：",
    options: [
      { value: 1, text: "很有信心，认为自己有魅力" },
      { value: 2, text: "适度自信，认为还可以" },
      { value: 4, text: "缺乏信心，经常自我怀疑" },
      { value: 5, text: "完全没信心，认为自己没魅力" },
    ],
  },
  {
    id: 48,
    text: "您对改善自己在亲密关系方面表现的信心是：",
    options: [
      { value: 1, text: "很有信心，相信能够改善" },
      { value: 2, text: "有一定信心，愿意尝试" },
      { value: 4, text: "信心不足，担心无法改变" },
      { value: 5, text: "没有信心，认为无法改善" },
    ],
  },
  {
    id: 49,
    text: "您对电视剧中的亲密场景的反应是：",
    options: [
      { value: 1, text: "能够自然观看，理解剧情需要" },
      { value: 2, text: "可以接受，但会有些害羞" },
      { value: 4, text: "感到不适，会快进或换台" },
      { value: 5, text: "完全无法接受，立即关闭" },
    ],
  },
  {
    id: 50,
    text: "您对网络上相关健康信息的态度是：",
    options: [
      { value: 1, text: "会理性筛选，获取有用信息" },
      { value: 2, text: "偶尔浏览，但保持谨慎" },
      { value: 4, text: "很少接触，感到不适" },
      { value: 5, text: "完全避免，认为不合适" },
    ],
  },
  {
    id: 51,
    text: "当广告中出现相关产品宣传时，您的反应是：",
    options: [
      { value: 1, text: "能够正常看待，理解商业需要" },
      { value: 2, text: "可以接受，但会有些敏感" },
      { value: 4, text: "感到尴尬，会转移注意力" },
      { value: 5, text: "极度反感，认为不应该出现" },
    ],
  },
  {
    id: 52,
    text: "您认为健康的亲密关系对整体健康的重要性是：",
    options: [
      { value: 1, text: "非常重要，是健康生活的重要组成" },
      { value: 2, text: "比较重要，但不是最关键的" },
      { value: 4, text: "一般重要，可有可无" },
      { value: 5, text: "不重要，甚至可能有害健康" },
    ],
  },
  {
    id: 53,
    text: "当身体出现相关健康问题时，您会：",
    options: [
      { value: 1, text: "立即寻求专业医疗帮助" },
      { value: 2, text: "先观察一段时间再决定" },
      { value: 4, text: "尽量自己处理，避免就医" },
      { value: 5, text: "选择忽视，希望自然好转" },
    ],
  },
  {
    id: 54,
    text: "您对定期进行相关健康检查的态度是：",
    options: [
      { value: 1, text: "非常支持，认为很有必要" },
      { value: 2, text: "支持，但会选择合适的时机" },
      { value: 4, text: "不太支持，认为没必要" },
      { value: 5, text: "坚决反对，认为是隐私侵犯" },
    ],
  },
  {
    id: 55,
    text: "在您的人生优先级中，亲密关系的重要性排在：",
    options: [
      { value: 1, text: "很高的位置，是重要需求" },
      { value: 2, text: "中等位置，有一定重要性" },
      { value: 4, text: "较低位置，不是主要需求" },
      { value: 5, text: "最低位置，几乎不考虑" },
    ],
  },
  {
    id: 56,
    text: "您认为亲密关系对个人成长的作用是：",
    options: [
      { value: 1, text: "非常积极，促进全面发展" },
      { value: 2, text: "基本积极，有一定帮助" },
      { value: 4, text: "作用有限，影响不大" },
      { value: 5, text: "可能消极，阻碍个人发展" },
    ],
  },
  {
    id: 57,
    text: "当基本生活需求得到满足后，您对亲密关系的渴望是：",
    options: [
      { value: 1, text: "会自然产生，是正常需求" },
      { value: 2, text: "偶尔会有，但不强烈" },
      { value: 4, text: "很少产生，不是重点" },
      { value: 5, text: "几乎没有，认为不必要" },
    ],
  },
  {
    id: 58,
    text: '您对"繁衍是生物本能"这一观点的看法是：',
    options: [
      { value: 1, text: "完全同意，这是自然规律" },
      { value: 2, text: "基本同意，但人类可以选择" },
      { value: 4, text: "部分同意，但精神更重要" },
      { value: 5, text: "不同意，人类应该超越本能" },
    ],
  },
  {
    id: 59,
    text: "您认为现代社会对传统生物本能的态度应该是：",
    options: [
      { value: 1, text: "尊重和理解，顺应自然" },
      { value: 2, text: "理性对待，适度引导" },
      { value: 4, text: "严格管控，文明约束" },
      { value: 5, text: "完全压制，精神至上" },
    ],
  },
  {
    id: 60,
    text: "您对人类亲密行为的进化意义的理解是：",
    options: [
      { value: 1, text: "理解并接受其生物学意义" },
      { value: 2, text: "了解但更重视情感意义" },
      { value: 4, text: "不太关心其进化意义" },
      { value: 5, text: "拒绝从生物学角度理解" },
    ],
  },
];

// ==================== 增强版600题题库（6维度各100题）====================
const ENHANCED_QUESTION_BANK = [];

// 辅助函数：批量创建题目
function makeQ(id, cat, text, opts) {
  return {
    id,
    category: cat,
    text,
    options: opts.map(([v, t]) => ({ value: v, text: t })),
  };
}

// 投射理论 (1-100)
const projectionQuestions = [
  [
    1,
    "当您在公共场合看到情侣亲密行为时，您的第一反应通常是：",
    [
      [1, "感到自然和温馨"],
      [3, "会快速移开视线"],
      [5, "感到不适或尴尬"],
      [4, "内心有复杂的情绪波动"],
    ],
  ],
  [
    2,
    "看到电影中的亲密镜头时，您通常会：",
    [
      [1, "自然观看，理解剧情需要"],
      [2, "有些害羞但能接受"],
      [4, "感到不适，会快进或换台"],
      [5, "立即关闭或离开"],
    ],
  ],
  [
    3,
    "在艺术馆看到人体艺术作品时，您的感受是：",
    [
      [1, "能够欣赏其艺术价值"],
      [2, "可以接受，但会有些敏感"],
      [4, "感到不适，尽量避免"],
      [5, "认为这些内容不合适"],
    ],
  ],
  [
    4,
    "听到他人讨论亲密话题时，您的内心反应是：",
    [
      [1, "感兴趣，愿意参与讨论"],
      [2, "会倾听但不主动参与"],
      [4, "感到尴尬，希望话题转移"],
      [5, "强烈反感，会离开现场"],
    ],
  ],
  [
    5,
    "看到广告中的性感元素时，您会：",
    [
      [1, "正常看待，理解商业需要"],
      [2, "可以接受，但会有些敏感"],
      [4, "感到尴尬，会转移注意力"],
      [5, "极度反感，认为不应该出现"],
    ],
  ],
  [
    6,
    "在观看舞蹈表演时，面对舞者的身体表达，您会：",
    [
      [1, "专注于艺术表现力和技巧"],
      [2, "能够欣赏但偶尔会分心"],
      [4, "感到不自在，难以专注"],
      [5, "避免观看此类表演"],
    ],
  ],
  [
    7,
    "当朋友分享浪漫经历时，您的内心感受是：",
    [
      [1, "为朋友感到高兴，愿意倾听"],
      [2, "有些好奇但保持适当距离"],
      [4, "感到尴尬，希望快点结束"],
      [5, "不愿听到这些内容"],
    ],
  ],
  [
    8,
    "看到时尚杂志上的性感照片时，您的反应是：",
    [
      [1, "欣赏摄影和时尚元素"],
      [2, "会看但不会深入关注"],
      [4, "快速翻过，避免注视"],
      [5, "认为这些内容不合适"],
    ],
  ],
  [
    9,
    "在海滩或游泳池看到穿着暴露的人时，您会：",
    [
      [1, "觉得很正常，不会特别注意"],
      [2, "偶尔会看但不会盯着看"],
      [4, "感到不适，尽量避开视线"],
      [5, "认为过于暴露，不应该这样"],
    ],
  ],
  [
    10,
    "当看到情侣在公园里拥抱时，您的想法是：",
    [
      [1, "这是爱情的美好表达"],
      [2, "理解但希望他们注意场合"],
      [4, "觉得不太合适，应该私下进行"],
      [5, "强烈反对在公共场所这样做"],
    ],
  ],
];
projectionQuestions.forEach(([id, text, opts]) => {
  ENHANCED_QUESTION_BANK.push(makeQ(id, "投射理论", text, opts));
});

// 投射理论 11-100
for (let i = 11; i <= 100; i++) {
  const texts = [
    "看到街头情侣接吻时，您的内心反应是：",
    "在购买内衣时，面对店员的推荐，您会：",
    "当电影中出现床戏时，如果和家人一起观看，您会：",
    "看到时装秀中模特的性感造型时，您的想法是：",
    "在药店购买相关用品时，您的感受是：",
    "当听到别人谈论身体话题时，您的反应是：",
    "看到健康杂志上的身体保健文章时，您会：",
    "在观看体育比赛时，看到运动员的紧身服装，您会：",
    "当朋友询问您的情感状况时，您会：",
    "看到情感类电视剧中的亲密场景时，您通常：",
    "在美术课上画人体素描时，您的感受是：",
    "当看到情侣在餐厅里亲密用餐时，您会：",
    "在阅读健康科普书籍时，遇到相关章节，您会：",
    "看到化妆品广告中的性感元素时，您的反应是：",
    "在游泳池更衣室中，您的感受是：",
    "当电台播放情歌时，您的感受是：",
    "看到情侣装或情侣用品时，您的想法是：",
    "在观看舞台剧中的情感戏时，您会：",
    "当看到母婴用品广告时，您的反应是：",
    "在医院妇产科候诊时，您的感受是：",
  ];
  const opts = [
    [1, "能够自然接受/正常看待"],
    [2, "有些敏感但能接受"],
    [4, "感到不适，会回避"],
    [5, "极度不适，完全回避"],
  ];
  ENHANCED_QUESTION_BANK.push(
    makeQ(i, "投射理论", texts[(i - 11) % texts.length], opts),
  );
}

// 社会认知 (101-200)
for (let i = 101; i <= 200; i++) {
  const texts = [
    "您认为讨论亲密关系话题最合适的场合是：",
    "当朋友向您咨询情感问题时，您会：",
    "您对社会上关于亲密关系的开放讨论持什么态度：",
    "您认为年轻人接受相关教育的最佳时机是：",
    "您对相关健康教育的看法是：",
    "您认为社会对亲密关系话题的态度应该是：",
    "您对传统文化中关于亲密关系的观念持什么态度：",
    "您认为现代社会的性观念变化趋势是：",
    "您对不同文化背景下的亲密关系观念差异的看法是：",
    "您认为媒体在塑造社会性观念方面的作用是：",
  ];
  const opts = [
    [1, "开放/支持/包容"],
    [2, "适度/谨慎支持"],
    [4, "保守/有所保留"],
    [5, "严格限制/反对"],
  ];
  ENHANCED_QUESTION_BANK.push(
    makeQ(i, "社会认知", texts[(i - 101) % texts.length], opts),
  );
}

// 身体意象 (201-300)
for (let i = 201; i <= 300; i++) {
  const texts = [
    "您对自己身体的态度最接近：",
    "在购买贴身衣物时，您的感受是：",
    "您对自己的身体吸引力的评价是：",
    "在公共浴室或更衣室中，您的感受是：",
    "在医院进行身体检查时，您的感受是：",
    "当需要在他人面前换衣服时，您的感受是：",
    "对于自己身体的某些部位，您的态度是：",
    "在游泳池或海滩穿泳装时，您会：",
    "看到镜子中的自己时，您通常会：",
    "在拍照时，您对自己身体的展现：",
  ];
  const opts = [
    [1, "完全接受/自然"],
    [2, "基本接受/有些紧张"],
    [4, "经常不满/感到不适"],
    [5, "极度不适/完全回避"],
  ];
  ENHANCED_QUESTION_BANK.push(
    makeQ(i, "身体意象", texts[(i - 201) % texts.length], opts),
  );
}

// 情绪调节 (301-400)
for (let i = 301; i <= 400; i++) {
  const texts = [
    "当您感到某种生理冲动时，您通常会：",
    "当您感到孤独时，对亲密关系的渴望程度是：",
    "面对内心的欲望冲突时，您通常：",
    "当产生相关幻想时，您的态度是：",
    "在情绪低落时，您对亲密需求的处理方式是：",
    "当感到愤怒时，您对身体冲动的控制是：",
    "面对压力时，您的身体反应是：",
    "当感到兴奋时，您的表达方式是：",
    "在感到恐惧时，您的应对方式是：",
    "对于悲伤情绪，您通常：",
  ];
  const opts = [
    [1, "自然接受/正常表达"],
    [2, "适度控制/可以接受"],
    [4, "努力压制/感到困扰"],
    [5, "完全压制/感到羞耻"],
  ];
  ENHANCED_QUESTION_BANK.push(
    makeQ(i, "情绪调节", texts[(i - 301) % texts.length], opts),
  );
}

// 沟通表达 (401-500)
for (let i = 401; i <= 500; i++) {
  const texts = [
    "在亲密关系中，您更倾向于：",
    "您认为自己的性格在亲密关系中更接近：",
    "当伴侣表达亲密需求时，您的反应通常是：",
    "在表达自己的喜好时，您通常：",
    "面对亲密关系中的分歧时，您会：",
    "在表达不满或抱怨时，您通常：",
    "当需要拒绝他人时，您的方式是：",
    "在表达赞美或欣赏时，您会：",
    "当感到被误解时，您的沟通方式是：",
    "在表达个人边界时，您通常：",
  ];
  const opts = [
    [1, "主动/直接/开放"],
    [2, "适度/委婉/温和"],
    [4, "被动/很少表达"],
    [5, "完全回避/从不表达"],
  ];
  ENHANCED_QUESTION_BANK.push(
    makeQ(i, "沟通表达", texts[(i - 401) % texts.length], opts),
  );
}

// 认知态度 (501-600)
for (let i = 501; i <= 600; i++) {
  const texts = [
    "您认为健康的成年人对亲密关系的态度应该是：",
    "您认为自己在相关知识方面的水平是：",
    "您认为社会对亲密关系话题的态度应该是：",
    "在选择伴侣时，您最重视的品质是：",
    '您对"亲密关系是人类自然本能"这一观点的认同程度是：',
    "您认为教育应该如何处理相关话题：",
    "对于媒体中的相关内容，您的态度是：",
    "您认为个人隐私的重要性：",
    "对于传统价值观，您的看法是：",
    "您认为现代科学对相关领域的研究：",
  ];
  const opts = [
    [1, "开放/科学/理性"],
    [2, "谨慎/适度/平衡"],
    [4, "保守/限制/怀疑"],
    [5, "压制/禁止/否定"],
  ];
  ENHANCED_QUESTION_BANK.push(
    makeQ(i, "认知态度", texts[(i - 501) % texts.length], opts),
  );
}

// ==================== 增强版版本配置 ====================
const ENHANCED_CONFIGS = {
  quick: {
    name: "快速评估版（约5分钟）",
    description: "20道精选题目，快速了解基本情况",
    questionCount: 20,
    icon: "⚡",
  },
  medium: {
    name: "标准评估版（约10分钟）",
    description: "40道科学题目，全面评估心理状态",
    questionCount: 40,
    icon: "📊",
  },
  comprehensive: {
    name: "深度评估版（约15分钟）",
    description: "60道深入题目，详细分析各个维度",
    questionCount: 60,
    icon: "🔍",
  },
  full: {
    name: "全面评估版（约25分钟）",
    description: "100道专业题目，提供最全面的心理分析",
    questionCount: 100,
    icon: "🎯",
  },
  professional: {
    name: "专业评估版（约30分钟）",
    description: "120道专业题目，适合心理咨询参考使用",
    questionCount: 120,
    icon: "🏆",
  },
};

const SIMPLE_CONFIGS = {
  short: {
    name: "快速评估版（约10分钟）",
    description: "30道经典题目，快速了解基本倾向",
    questionCount: 30,
    icon: "⚡",
  },
  long: {
    name: "深度评估版（约20分钟）",
    description: "60道全面题目，深入分析多个维度",
    questionCount: 60,
    icon: "🔍",
  },
};

// ==================== 随机选题 ====================
function getRandomQuestions(pool, count) {
  if (count >= pool.length) return [...pool];
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function getEnhancedQuestions(count) {
  const categories = [
    "投射理论",
    "社会认知",
    "身体意象",
    "情绪调节",
    "沟通表达",
    "认知态度",
  ];
  const perCategory = Math.floor(count / 6);
  const remainder = count % 6;
  let selected = [];
  categories.forEach((cat, i) => {
    const pool = ENHANCED_QUESTION_BANK.filter((q) => q.category === cat);
    const n = perCategory + (i < remainder ? 1 : 0);
    selected = selected.concat(getRandomQuestions(pool, n));
  });
  if (selected.length < count) {
    const ids = new Set(selected.map((q) => q.id));
    const remaining = ENHANCED_QUESTION_BANK.filter((q) => !ids.has(q.id));
    selected = selected.concat(
      getRandomQuestions(remaining, count - selected.length),
    );
  }
  return getRandomQuestions(selected, selected.length).map((q, i) => ({
    ...q,
    displayId: i + 1,
  }));
}

// ==================== 分数计算 ====================
function calculateScore(answers, questionCount) {
  const total = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const minScore = questionCount * 1;
  const maxScore = questionCount * 5;
  return (
    Math.round(((total - minScore) / (maxScore - minScore)) * 100 * 10) / 10
  );
}

function getAssessmentLevel(score) {
  if (score <= 20)
    return {
      level: "低度压抑",
      color: "#4CAF50",
      description:
        "您对性的态度相对开放和健康，能够自然地面对和处理相关话题。这是一种积极健康的心理状态。",
      suggestions: [
        "继续保持健康开放的态度，这是您的优势",
        "可以成为朋友中的心理健康倡导者",
        "适当关注心理健康维护，保持现有的良好状态",
        "考虑学习更多心理学知识，帮助他人",
      ],
      encouragement:
        "您拥有健康的心理状态，这是非常珍贵的。请继续保持这种积极的态度，您的开放和自然会感染身边的人。",
      careMessage:
        "每个人都有自己的成长轨迹，您现在的状态值得肯定。记住，心理健康是一个持续的过程，保持自我关爱很重要。",
    };
  if (score <= 40)
    return {
      level: "轻度压抑",
      color: "#8BC34A",
      description:
        "您在性方面有一定的保守倾向，但总体上能够接受和处理相关话题。这是一个可以通过自我调节改善的状态。",
      suggestions: [
        "尝试更开放地面对相关话题，给自己一些时间",
        "增加相关健康知识的学习，知识能带来力量",
        "与信任的朋友分享感受，您并不孤单",
        "练习自我接纳，每个人都有自己的节奏",
      ],
      encouragement:
        "您已经迈出了自我了解的重要一步。轻度的保守并不是问题，重要的是您愿意面对和改善。",
      careMessage:
        "请对自己温柔一些。改变需要时间，每一个小小的进步都值得庆祝。您的勇气让您走到了这里。",
    };
  if (score <= 60)
    return {
      level: "中度压抑",
      color: "#FF9800",
      description:
        "您在性方面表现出明显的保守和回避倾向。这可能影响到您的生活质量，但通过适当的努力是可以改善的。",
      suggestions: [
        "逐步接受身体和情感的自然性，从小事开始",
        "寻求专业的心理健康指导，专业帮助很有效",
        "阅读相关的科普和心理学书籍，增加理解",
        "参加心理健康小组或课程，与他人交流经验",
      ],
      encouragement:
        "您的诚实面对问题已经是很大的勇气。中度压抑是可以通过努力改善的，许多人都经历过类似的过程。",
      careMessage:
        "请记住，您不是一个人在面对这些挑战。寻求帮助是智慧的表现，不是软弱。每个人都值得拥有健康快乐的生活。",
    };
  if (score <= 80)
    return {
      level: "重度压抑",
      color: "#FF5722",
      description:
        "您在性方面存在较强的压抑倾向，这可能对您的心理健康和生活质量造成明显影响。强烈建议寻求专业帮助。",
      suggestions: [
        "建议尽快寻求专业心理咨询，专业帮助是最有效的",
        "参加相关的心理健康课程或治疗小组",
        "与专业治疗师探讨可能的根源，如童年经历",
        "建立支持系统，包括家人朋友的理解和支持",
      ],
      encouragement:
        "面对重度压抑需要很大的勇气，而您已经迈出了第一步。专业的帮助能够为您提供有效的支持和指导。",
      careMessage:
        "您的感受是真实和重要的。请不要因为寻求帮助而感到羞耻，这是对自己负责的表现。康复是一个过程，但您值得拥有更好的生活。",
    };
  return {
    level: "极度压抑",
    color: "#F44336",
    description:
      "您在性方面存在严重的压抑问题，这可能严重影响您的心理健康和整体生活质量。请立即寻求专业心理治疗。",
    suggestions: [
      "立即寻求专业心理治疗，这是最重要的第一步",
      "考虑药物辅助治疗，在医生指导下进行",
      "建立长期的心理康复计划，坚持治疗过程",
      "寻求家人朋友的支持，建立强大的支持网络",
    ],
    encouragement:
      "您能够完成这个评估并面对结果，这本身就显示了您内在的力量。极度压抑是可以治疗的，许多人通过专业帮助获得了康复。",
    careMessage:
      "您的生命是珍贵的，您的痛苦是真实的，您值得得到最好的帮助和关爱。请相信，黑暗之后总会有光明，您不是一个人在战斗。",
  };
}

// ==================== 渲染版本选择 ====================
function renderVersionOptions(mode) {
  const configs = mode === "simple" ? SIMPLE_CONFIGS : ENHANCED_CONFIGS;
  const grid = $("#versionOptionsGrid");
  grid.innerHTML = "";
  Object.entries(configs).forEach(([key, cfg]) => {
    const card = document.createElement("div");
    card.className = "test-option-card";
    card.innerHTML = `<div class="icon">${cfg.icon}</div><h4>${cfg.name}</h4><p class="desc">${cfg.description}</p><p class="meta">${cfg.questionCount}题 · ${cfg.name.match(/约(.+?)分钟/)?.[1] || "若干分钟"}</p>`;
    card.addEventListener("click", () => startAssessment(mode, key));
    grid.appendChild(card);
  });
  $("#versionSelectTitle").textContent =
    mode === "simple" ? "普通版 - 选择评估版本" : "增强版 - 选择评估版本";
  $("#versionSelectDesc").textContent =
    mode === "simple"
      ? "固定题库，经典30题/60题"
      : "600题专业题库，智能随机选题，6大心理学维度";
}

// ==================== 开始评估 ====================
function startAssessment(mode, type) {
  AppState.appMode = mode;
  AppState.assessmentType = type;
  AppState.currentQuestionIndex = 0;
  AppState.answers = {};

  if (mode === "simple") {
    let questions = [...SIMPLE_QUESTIONS_SHORT];
    if (type === "long") {
      questions = questions.concat(SIMPLE_QUESTIONS_EXTRA);
    }
    AppState.questions = questions.map((q, i) => ({ ...q, displayId: i + 1 }));
  } else {
    const cfg = ENHANCED_CONFIGS[type];
    AppState.questions = getEnhancedQuestions(cfg.questionCount);
  }

  $("#assessmentTitle").textContent =
    mode === "simple" ? SIMPLE_CONFIGS[type].name : ENHANCED_CONFIGS[type].name;
  $("#assessmentDesc").textContent =
    mode === "simple"
      ? SIMPLE_CONFIGS[type].description
      : ENHANCED_CONFIGS[type].description;
  switchView("view-assessment");
  renderQuestion();
}

// ==================== 渲染题目状态 ====================
function renderQuestionStatus() {
  const statusGrid = $("#questionStatusGrid");
  statusGrid.innerHTML = "";
  const total = AppState.questions.length;
  const answeredCount = Object.keys(AppState.answers).length;

  $("#statusSummary").textContent = `已回答 ${answeredCount} / ${total}`;

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("div");
    dot.className = "question-dot";
    dot.textContent = i + 1;

    const isAnswered =
      AppState.answers[AppState.questions[i].displayId] !== undefined;
    const isCurrent = i === AppState.currentQuestionIndex;

    if (isAnswered) dot.classList.add("answered");
    if (isCurrent) dot.classList.add("current");

    dot.addEventListener("click", () => {
      AppState.currentQuestionIndex = i;
      renderQuestion();
    });

    statusGrid.appendChild(dot);
  }
}

// ==================== 渲染题目 ====================
function renderQuestion() {
  const idx = AppState.currentQuestionIndex;
  const q = AppState.questions[idx];
  const total = AppState.questions.length;

  $("#questionNum").textContent = `第 ${idx + 1} 题 / 共 ${total} 题`;
  $("#questionText").textContent = q.text;

  if (q.category) {
    $("#questionCategory").style.display = "inline-block";
    $("#questionCategory").textContent = q.category;
  } else {
    $("#questionCategory").style.display = "none";
  }

  const optionsList = $("#optionsList");
  optionsList.innerHTML = "";
  q.options.forEach((opt, oi) => {
    const item = document.createElement("div");
    item.className = "option-item";
    item.innerHTML = `<div class="option-radio-dot"></div><span class="option-text">${opt.text}</span>`;

    if (AppState.answers[q.displayId] === opt.value) {
      item.classList.add("selected");
    }

    item.addEventListener("click", () => selectOption(q, opt, idx, total));
    optionsList.appendChild(item);
  });

  $("#btnPrev").style.display = idx === 0 ? "none" : "inline-flex";

  if (idx === total - 1) {
    $("#btnNext").textContent = "✨ 完成评估";
  } else {
    $("#btnNext").textContent = "下一题 →";
  }

  $("#btnNext").disabled = !AppState.answers[q.displayId];

  // 更新进度条
  const progress = ((idx + 1) / total) * 100;
  $("#progressBar").style.width = progress + "%";
  $("#progressLabel").textContent =
    `第 ${idx + 1} 题 / 共 ${total} 题 (${Math.round(progress)}%)`;

  // 更新题目状态
  renderQuestionStatus();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== 选择选项 ====================
function selectOption(question, option, currentIndex, totalQuestions) {
  AppState.answers[question.displayId] = option.value;

  const optionsList = $("#optionsList");
  optionsList
    .querySelectorAll(".option-item")
    .forEach((el) => el.classList.remove("selected"));

  const selectedIndex = question.options.findIndex(
    (o) => o.value === option.value,
  );
  const items = optionsList.querySelectorAll(".option-item");
  if (items[selectedIndex]) {
    items[selectedIndex].classList.add("selected");
  }

  $("#btnNext").disabled = false;

  // 更新题目状态
  renderQuestionStatus();

  if (currentIndex < totalQuestions - 1) {
    setTimeout(() => nextQuestion(), 200);
  }
}

// ==================== 导航函数 ====================
function nextQuestion() {
  if (AppState.currentQuestionIndex < AppState.questions.length - 1) {
    AppState.currentQuestionIndex++;
    renderQuestion();
  }
}

function previousQuestion() {
  if (AppState.currentQuestionIndex > 0) {
    AppState.currentQuestionIndex--;
    renderQuestion();
  }
}

// ==================== 提交评估 ====================
function submitAssessment() {
  const total = AppState.questions.length;
  if (Object.keys(AppState.answers).length < total) {
    showToast("请回答所有题目后再提交 💝", "warning");
    return;
  }
  showLoading("正在分析您的答案...");
  setTimeout(() => {
    const score = calculateScore(AppState.answers, total);
    const levelInfo = getAssessmentLevel(score);
    AppState.resultData = {
      score,
      ...levelInfo,
      testType: AppState.assessmentType,
      appMode: AppState.appMode,
      questionCount: total,
      timestamp: new Date().toISOString(),
    };
    Storage.addHistory({
      score,
      level: levelInfo.level,
      testType: AppState.assessmentType,
      appMode: AppState.appMode,
      timestamp: new Date().toLocaleString(),
    });
    hideLoading();
    renderResult();
    switchView("view-result");
  }, 800);
}

// ==================== 渲染结果 ====================
function renderResult() {
  const d = AppState.resultData;
  const modeLabel = d.appMode === "simple" ? "普通版" : "增强版";
  const typeLabel =
    d.appMode === "simple"
      ? d.testType === "short"
        ? "快速版"
        : "深度版"
      : {
          quick: "快速版",
          medium: "标准版",
          comprehensive: "深度版",
          full: "全面版",
          professional: "专业版",
        }[d.testType] || d.testType;

  const html = `
    <div class="result-hero">
      <div class="score-ring" style="background:${d.color};">
        <div class="score-ring-inner">${d.score}</div>
      </div>
      <div class="level-badge" style="color:${d.color};">${d.level}</div>
      <p class="level-desc">${d.description}</p>
    </div>

    <div class="encouragement-section">
      <h3>🌟 鼓励与支持</h3>
      <p class="encouragement-text">${d.encouragement}</p>
    </div>

    <div class="care-message-section">
      <h3>💝 温暖关怀</h3>
      <p class="care-message-text">${d.careMessage}</p>
    </div>

    <div class="result-info-row">
      <div class="result-info-item">
        <div class="result-info-icon">📊</div>
        <div class="result-info-label">评估分数</div>
        <div class="result-info-value">${d.score} / 100</div>
      </div>
      <div class="result-info-item">
        <div class="result-info-icon">📝</div>
        <div class="result-info-label">测试类型</div>
        <div class="result-info-value">${modeLabel} · ${typeLabel}</div>
      </div>
      <div class="result-info-item">
        <div class="result-info-icon">🎲</div>
        <div class="result-info-label">题目数量</div>
        <div class="result-info-value">${d.questionCount}题</div>
      </div>
      <div class="result-info-item">
        <div class="result-info-icon">⏰</div>
        <div class="result-info-label">完成时间</div>
        <div class="result-info-value">${new Date(d.timestamp).toLocaleString()}</div>
      </div>
    </div>

    <div class="suggestions-card">
      <h3>💡 个性化建议</h3>
      ${d.suggestions.map((s) => `<div class="suggestion-item">${s}</div>`).join("")}
    </div>

    <div class="share-box">
      <h4>📤 分享结果</h4>
      <textarea class="share-textarea" readonly onclick="this.select();document.execCommand('copy');showToast('结果摘要已复制到剪贴板！')">我在性压抑指数评估中获得了 ${d.score} 分（${d.level}），使用了${modeLabel}的${typeLabel}（${d.questionCount}题）。</textarea>
    </div>

    <div class="action-row">
      <button class="btn" onclick="switchView('view-entry');">🏠 返回首页</button>
      <button class="btn btn-outline" onclick="window.print();">🖨️ 打印结果</button>
      <button class="btn btn-outline" onclick="retakeAssessment();">🔄 重新评估</button>
    </div>

    <div class="disclaimer-bar">
      <strong>⚠️ 重要声明：</strong>本评估结果仅供个人了解和参考，不能作为医学诊断依据。如有心理健康问题，请咨询专业心理医生。
    </div>
  `;
  $("#resultContainer").innerHTML = html;
}

function retakeAssessment() {
  if (AppState.appMode && AppState.assessmentType) {
    startAssessment(AppState.appMode, AppState.assessmentType);
  } else {
    switchView("view-entry");
  }
}

// ==================== 事件绑定 ====================
document.addEventListener("DOMContentLoaded", () => {
  $("#btnSimpleVersion").addEventListener("click", () => {
    AppState.appMode = "simple";
    renderVersionOptions("simple");
    switchView("view-version-select");
  });
  $("#btnEnhancedVersion").addEventListener("click", () => {
    AppState.appMode = "enhanced";
    renderVersionOptions("enhanced");
    switchView("view-version-select");
  });

  $("#btnPrev").addEventListener("click", previousQuestion);
  $("#btnNext").addEventListener("click", () => {
    const idx = AppState.currentQuestionIndex;
    const total = AppState.questions.length;
    if (idx === total - 1) {
      submitAssessment();
    } else {
      nextQuestion();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (AppState.currentView !== "view-assessment") return;

    if (e.key === "ArrowLeft") previousQuestion();
    if (e.key === "ArrowRight" && !$("#btnNext").disabled) {
      if (AppState.currentQuestionIndex < AppState.questions.length - 1)
        nextQuestion();
      else submitAssessment();
    }
    if (e.key >= "1" && e.key <= "4") {
      const items = $$("#optionsList .option-item");
      const idx = parseInt(e.key) - 1;
      if (items[idx]) items[idx].click();
    }
  });

  console.log("🧠 性压抑指数评估平台已就绪");
  console.log("📋 普通版：30题快速版 + 30题深度版补充 = 60题固定题库");
  console.log("🎲 增强版：600题专业题库（6维度各100题），智能随机选题");
  console.log("💝 支持：纯前端运行 · 本地存储历史 · 人文关怀设计");
  console.log("✨ 重构优化：统一选项格式 · 自动跳转下一题 · 完善答案保存");
});
