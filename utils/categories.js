const PRESET_CATEGORIES = {
  assets: [
    { id: 'wechat', name: '微信零钱', icon: '💳' },
    { id: 'wechat_fund', name: '微信零钱通', icon: '💰' },
    { id: 'alipay', name: '支付宝余额', icon: '💳' },
    { id: 'alipay_fund', name: '支付宝余额宝', icon: '💰' },
    { id: 'alipay_invest', name: '支付宝基金', icon: '📈' },
    { id: 'bank_card', name: '银行卡', icon: '🏦' },
    { id: 'transit', name: '交通卡', icon: '🚇' },
    { id: 'provident_fund', name: '公积金余额', icon: '🏠' },
    { id: 'medical', name: '医保余额', icon: '🏥' }
  ],
  liabilities: [
    { id: 'credit_card', name: '信用卡', icon: '💳' },
    { id: 'alipay_huabei', name: '支付宝花呗', icon: '🌸' }
  ]
}

function getPresetsByType(type) {
  return PRESET_CATEGORIES[type] || []
}

function getPreset(id) {
  for (const type of ['assets', 'liabilities']) {
    const found = PRESET_CATEGORIES[type].find(p => p.id === id)
    if (found) return { ...found, type }
  }
  return null
}

module.exports = {
  PRESET_CATEGORIES,
  getPresetsByType,
  getPreset
}
