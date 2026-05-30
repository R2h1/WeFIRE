const PRESETS = {
  expense: [
    { cat1: '餐饮', emoji: '🍚', cat2: ['早饭', '午饭', '晚饭', '零食', '水果', '买菜'] },
    { cat1: '交通', emoji: '🚇', cat2: ['地铁', '打车', '停车', '轻轨', '机票', '共享骑行'] },
    { cat1: '日用', emoji: '🛒', cat2: ['日用品', '衣服', '超市', '床垫', '电子产品', '收纳'] },
    { cat1: '居住', emoji: '🏡', cat2: ['房租', '话费', '宽带', '押金', '中介服务', '保洁'] },
    { cat1: '娱乐/会员', emoji: '🎬', cat2: ['会员', '爱好', '电影', '唱歌'] },
    { cat1: '个人护理', emoji: '💇', cat2: ['理发', '护肤', '洗护', '冲牙器'] },
    { cat1: '医疗健康', emoji: '💊', cat2: ['药品', '诊疗'] },
    { cat1: '人情', emoji: '🎁', cat2: ['礼金', '红包', '祭祀'] },
    { cat1: '休闲/旅游', emoji: '✈️', cat2: ['旅游', '住宿'] },
    { cat1: '营销/推广', emoji: '📢', cat2: ['推广'] },
    { cat1: '金融/债务', emoji: '💳', cat2: ['消费贷'] },
    { cat1: '房贷', emoji: '🏠', cat2: ['房贷还款'] },
    { cat1: '借款转出', emoji: '↗️', cat2: ['借款'], isTransfer: true },
    { cat1: '其他支出', emoji: '📦', cat2: ['其他'] },
  ],
  income: [
    { cat1: '工资收入', emoji: '💰', cat2: ['工资'] },
    { cat1: '公积金入账', emoji: '🏦', cat2: ['公积金'], nonDisposable: true },
    { cat1: '其他收入', emoji: '📥', cat2: ['转账', '退款', '退货', '其他'] },
    { cat1: '借款收回', emoji: '↩️', cat2: ['还款'], isTransfer: true },
  ]
};

const CUSTOM_STORAGE_KEY = 'wefire_custom_cats';

function _getCustomCats() {
  try { return wx.getStorageSync(CUSTOM_STORAGE_KEY) || {}; } catch (e) { return {}; }
}

function _saveCustomCats(data) {
  try { wx.setStorageSync(CUSTOM_STORAGE_KEY, data); } catch (e) { /* ignore */ }
  _resetCaches();
}

let _fullCategories = null;
let _emojiMap = null;
let _tagMap = null;
let _presetCat1Set = null;
let _presetCat2Map = null;

function _resetCaches() {
  _fullCategories = null;
  _emojiMap = null;
  _tagMap = null;
}

function _getMergedCategories() {
  if (_fullCategories) return _fullCategories;
  const custom = _getCustomCats();
  _fullCategories = {};
  ['expense', 'income'].forEach(type => {
    _fullCategories[type] = [...PRESETS[type], ...(custom[type] || [])];
  });
  return _fullCategories;
}

function _buildPresetSets() {
  if (_presetCat1Set) return;
  _presetCat1Set = new Set();
  _presetCat2Map = {};
  Object.values(PRESETS).forEach(list => {
    list.forEach(c => {
      _presetCat1Set.add(c.cat1);
      _presetCat2Map[c.cat1] = new Set(c.cat2 || []);
    });
  });
}

function _buildEmojiMap() {
  if (_emojiMap) return _emojiMap;
  _emojiMap = {};
  Object.values(PRESETS).forEach(list => {
    list.forEach(c => { _emojiMap[c.cat1] = c.emoji; });
  });
  return _emojiMap;
}

function _buildTagMap() {
  if (_tagMap) return _tagMap;
  _tagMap = { isTransfer: {}, nonDisposable: {} };
  Object.entries(PRESETS).forEach(([type, list]) => {
    list.forEach(c => {
      if (c.isTransfer) _tagMap.isTransfer[type + ':' + c.cat1] = true;
      if (c.nonDisposable) _tagMap.nonDisposable[type + ':' + c.cat1] = true;
    });
  });
  return _tagMap;
}

function getEmoji(cat1) {
  return _buildEmojiMap()[cat1] || '📌';
}

function getCat1Options(type) {
  const list = _getMergedCategories()[type];
  return list ? list.map(c => c.cat1) : [];
}

function getCat2Options(cat1) {
  const cats = _getMergedCategories();
  let base = null;
  for (const list of Object.values(cats)) {
    const found = list.find(c => c.cat1 === cat1);
    if (found) { base = found.cat2 ? [...found.cat2] : ['其他']; break; }
  }
  if (!base) base = ['其他'];
  const custom = _getCustomCats();
  if (custom._cat2_additions && custom._cat2_additions[cat1]) {
    base = [...base, ...custom._cat2_additions[cat1]];
  }
  if (custom._hidden_cat2 && custom._hidden_cat2[cat1]) {
    const hidden = new Set(custom._hidden_cat2[cat1]);
    base = base.filter(n => !hidden.has(n));
  }
  return base;
}

function isTransferCategory(type, cat1) {
  return !!_buildTagMap().isTransfer[type + ':' + cat1];
}

function isNonDisposable(type, cat1) {
  return !!_buildTagMap().nonDisposable[type + ':' + cat1];
}

function isPresetCat1(name) {
  _buildPresetSets();
  return _presetCat1Set.has(name);
}

function isPresetCat2(cat1, name) {
  _buildPresetSets();
  return _presetCat2Map[cat1] ? _presetCat2Map[cat1].has(name) : false;
}

function addCustomCat1(type, name) {
  const custom = _getCustomCats();
  if (!custom[type]) custom[type] = [];
  custom[type].push({ cat1: name, emoji: '📌', cat2: ['其他'] });
  _saveCustomCats(custom);
  return getCat1Options(type);
}

function addCustomCat2(cat1, name) {
  if (isPresetCat1(cat1)) {
    const custom = _getCustomCats();
    if (!custom._cat2_additions) custom._cat2_additions = {};
    if (!custom._cat2_additions[cat1]) custom._cat2_additions[cat1] = [];
    custom._cat2_additions[cat1].push(name);
    _saveCustomCats(custom);
  } else {
    const custom = _getCustomCats();
    for (const type of ['expense', 'income']) {
      if (custom[type]) {
        const entry = custom[type].find(c => c.cat1 === cat1);
        if (entry) { entry.cat2.push(name); break; }
      }
    }
    _saveCustomCats(custom);
  }
  return getCat2Options(cat1);
}

function removeCustomCat1(type, name) {
  if (isPresetCat1(name)) return null;
  const custom = _getCustomCats();
  if (custom[type]) {
    custom[type] = custom[type].filter(c => c.cat1 !== name);
  }
  _saveCustomCats(custom);
  return getCat1Options(type);
}

function removeCustomCat2(cat1, name) {
  const custom = _getCustomCats();
  if (isPresetCat1(cat1) && isPresetCat2(cat1, name)) {
    if (!custom._hidden_cat2) custom._hidden_cat2 = {};
    if (!custom._hidden_cat2[cat1]) custom._hidden_cat2[cat1] = [];
    if (!custom._hidden_cat2[cat1].includes(name)) {
      custom._hidden_cat2[cat1].push(name);
    }
    _saveCustomCats(custom);
  } else if (isPresetCat1(cat1)) {
    if (custom._cat2_additions && custom._cat2_additions[cat1]) {
      custom._cat2_additions[cat1] = custom._cat2_additions[cat1].filter(n => n !== name);
      _saveCustomCats(custom);
    }
  } else {
    for (const type of ['expense', 'income']) {
      if (custom[type]) {
        const entry = custom[type].find(c => c.cat1 === cat1);
        if (entry) { entry.cat2 = entry.cat2.filter(n => n !== name); break; }
      }
    }
    _saveCustomCats(custom);
  }
  return getCat2Options(cat1);
}

function getDayOfWeek(dateStr) {
  const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
  try { return DAYS[new Date(dateStr).getDay()]; } catch (e) { return ''; }
}

module.exports = {
  PRESETS,
  getEmoji,
  getCat1Options,
  getCat2Options,
  isTransferCategory,
  isNonDisposable,
  isPresetCat1,
  isPresetCat2,
  addCustomCat1,
  addCustomCat2,
  removeCustomCat1,
  removeCustomCat2,
  getDayOfWeek,
};
