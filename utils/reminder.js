const storage = require('./storage');

const REMINDER_KEY = 'fire_reminder_config';

function getReminderConfig() {
  try {
    const data = wx.getStorageSync(REMINDER_KEY);
    return data || { subscribed: false, templateId: '' };
  } catch (e) {
    return { subscribed: false, templateId: '' };
  }
}

function saveReminderConfig(config) {
  wx.setStorageSync(REMINDER_KEY, config);
}

function shouldRemindToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // Last 2 days of month
  const lastDay = new Date(year, month, 0).getDate();
  if (now.getDate() < lastDay - 1) return false;

  // Check if already recorded this month
  const snapshots = storage.getSnapshots();
  const monthId = year + '-' + String(month).padStart(2, '0');
  return !snapshots.some((s) => (s.id || s.month) === monthId);
}

// == 开发者须知 ====
// 将此处的模板 ID 替换为你从微信公众平台获取的真实模板 ID
const SUBSCRIBE_TEMPLATE_ID = 'RgeuIi4lo--l5Kytk4AWJYBPUw8J1umSSSp27rKUCdc';

function getTemplateId() {
  return SUBSCRIBE_TEMPLATE_ID;
}

function requestSubscribe() {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TEMPLATE_ID],
      success(res) {
        const accepted = res[SUBSCRIBE_TEMPLATE_ID] === 'accept';
        const config = getReminderConfig();
        config.subscribed = accepted;
        saveReminderConfig(config);
        resolve({ accepted, errMsg: res.errMsg });
      },
      fail(err) {
        resolve({ accepted: false, errMsg: err.errMsg });
      },
    });
  });
}

module.exports = {
  getReminderConfig,
  saveReminderConfig,
  shouldRemindToday,
  getTemplateId,
  requestSubscribe,
};
