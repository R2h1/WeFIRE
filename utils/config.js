const SECTIONS = [
  {
    id: 'liquidAssets',
    label: '流动资产',
    addEnabled: true,
    addText: '添加资产',
    items: [
      {
        key: 'cash',
        name: '现金',
        multi: false,
        placeholder: '余额',
        fields: [{ key: 'value', label: '金额' }],
      },
      {
        key: 'bankCards',
        name: '银行',
        multi: true,
        limit: 10,
        fields: [{ key: 'balance', label: '余额' }],
      },
      {
        key: 'alipayAccounts',
        name: '支付宝',
        multi: true,
        limit: 5,
        fields: [{ key: 'total', label: '总额' }],
      },
      {
        key: 'wechatAccounts',
        name: '微信',
        multi: true,
        limit: 5,
        fields: [
          { key: 'balance', label: '零钱' },
          { key: 'changeFund', label: '零钱通' },
        ],
      },
      {
        key: 'medicalInsurance',
        name: '医保',
        multi: false,
        placeholder: '余额',
        fields: [{ key: 'value', label: '余额' }],
      },
      {
        key: 'housingFund',
        name: '公积金',
        multi: false,
        placeholder: '余额',
        fields: [{ key: 'value', label: '余额' }],
      },
      {
        key: 'otherAssets',
        name: '其他流动资产',
        multi: true,
        limit: -1,
        fields: [{ key: 'balance', label: '金额' }],
      },
    ],
  },
  {
    id: 'fixedAssets',
    label: '固定资产',
    addEnabled: true,
    addText: '添加资产',
    itemsStartActive: true,
    items: [
      {
        key: 'selfUse',
        name: '自住房',
        multi: false,
        placeholder: '估值',
        fields: [{ key: 'value', label: '估值' }],
      },
      {
        key: 'investment',
        name: '投资房',
        multi: false,
        placeholder: '估值',
        fields: [{ key: 'value', label: '估值' }],
      },
      {
        key: 'other',
        name: '其他固定资产',
        multi: true,
        limit: -1,
        fields: [{ key: 'balance', label: '金额' }],
      },
    ],
  },
  {
    id: 'shortLiabilities',
    label: '短期负债',
    addEnabled: true,
    addText: '添加负债',
    items: [
      {
        key: 'creditCards',
        name: '信用卡待还',
        multi: true,
        limit: 10,
        fields: [{ key: 'balance', label: '本期待还' }],
      },
      {
        key: 'huabei',
        name: '花呗',
        multi: false,
        placeholder: '待还总额',
        fields: [{ key: 'value', label: '待还总额' }],
      },
      {
        key: 'baitiao',
        name: '白条',
        multi: false,
        placeholder: '待还总额',
        fields: [{ key: 'value', label: '待还总额' }],
      },
      {
        key: 'otherShort',
        name: '其他短期借款',
        multi: true,
        limit: -1,
        fields: [{ key: 'balance', label: '剩余本金' }],
      },
    ],
  },
  {
    id: 'longLiabilities',
    label: '长期负债',
    addEnabled: true,
    addText: '添加负债',
    itemsStartActive: true,
    items: [
      {
        key: 'mortgage',
        name: '房贷',
        multi: false,
        placeholder: '剩余本金',
        fields: [{ key: 'value', label: '剩余本金' }],
      },
      {
        key: 'carLoan',
        name: '车贷',
        multi: false,
        placeholder: '剩余本金',
        fields: [{ key: 'value', label: '剩余本金' }],
      },
      {
        key: 'otherLong',
        name: '其他长期贷款',
        multi: true,
        limit: -1,
        fields: [{ key: 'balance', label: '剩余本金' }],
      },
    ],
  },
];

const ITEM_MAP = {};
SECTIONS.forEach((s) => {
  s.items.forEach((item) => {
    ITEM_MAP[item.key] = item;
  });
});

function getItemConfig(key) {
  return ITEM_MAP[key] || null;
}

function getSectionByItemKey(key) {
  for (const s of SECTIONS) {
    if (s.items.some((item) => item.key === key)) return s;
  }
  return null;
}

function createEmptySnapshot(monthId) {
  return {
    month: monthId,
    netWorth: 0,
    assets: {
      cash: 0,
      bankCards: [],
      alipayAccounts: [],
      wechatAccounts: [],
      medicalInsurance: 0,
      housingFund: 0,
      otherAssets: [],
    },
    fixedAssets: {
      selfUse: 0,
      investment: 0,
      other: [],
    },
    shortLiabilities: {
      creditCards: [],
      huabeiBaitiao: 0,
      otherShort: [],
    },
    longLiabilities: {
      mortgage: 0,
      carLoan: 0,
      otherLong: [],
    },
  };
}

function sumField(arr, field) {
  return arr.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
}

function calcItemTotal(snapshot, key) {
  const item = ITEM_MAP[key];
  if (!item) return 0;
  if (!item.multi) {
    return parseFloat(getSnapshotField(snapshot, '', key)) || 0;
  }
  const arr = getSnapshotField(snapshot, '', key) || [];
  if (key === 'wechatAccounts') {
    return arr.reduce(
      (s, inst) =>
        s +
        (parseFloat(inst.balance) || 0) +
        (parseFloat(inst.changeFund) || 0),
      0,
    );
  }
  return sumField(arr, 'balance') || sumField(arr, 'total');
}

function getSnapshotField(snapshot, sectionId, key) {
  // Map key to the right section path
  const pathMap = {
    // liquid assets
    cash: 'assets.cash',
    bankCards: 'assets.bankCards',
    alipayAccounts: 'assets.alipayAccounts',
    wechatAccounts: 'assets.wechatAccounts',
    medicalInsurance: 'assets.medicalInsurance',
    housingFund: 'assets.housingFund',
    otherAssets: 'assets.otherAssets',
    // fixed assets
    selfUse: 'fixedAssets.selfUse',
    investment: 'fixedAssets.investment',
    other: 'fixedAssets.other',
    // short liabilities
    creditCards: 'shortLiabilities.creditCards',
    huabeiBaitiao: 'shortLiabilities.huabeiBaitiao',
    otherShort: 'shortLiabilities.otherShort',
    // long liabilities
    mortgage: 'longLiabilities.mortgage',
    carLoan: 'longLiabilities.carLoan',
    otherLong: 'longLiabilities.otherLong',
  };
  const path = pathMap[key];
  if (!path) return undefined;
  const parts = path.split('.');
  let val = snapshot;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

function setSnapshotField(snapshot, key, value) {
  const pathMap = {
    cash: 'assets.cash',
    bankCards: 'assets.bankCards',
    alipayAccounts: 'assets.alipayAccounts',
    wechatAccounts: 'assets.wechatAccounts',
    medicalInsurance: 'assets.medicalInsurance',
    housingFund: 'assets.housingFund',
    otherAssets: 'assets.otherAssets',
    selfUse: 'fixedAssets.selfUse',
    investment: 'fixedAssets.investment',
    other: 'fixedAssets.other',
    creditCards: 'shortLiabilities.creditCards',
    huabeiBaitiao: 'shortLiabilities.huabeiBaitiao',
    otherShort: 'shortLiabilities.otherShort',
    mortgage: 'longLiabilities.mortgage',
    carLoan: 'longLiabilities.carLoan',
    otherLong: 'longLiabilities.otherLong',
  };
  const path = pathMap[key];
  if (!path) return;
  const parts = path.split('.');
  let obj = snapshot;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;
}

function calcTotalAssets(snapshot) {
  if (!snapshot) return 0;
  const a = snapshot.assets || {};
  const f = snapshot.fixedAssets || {};
  let total = 0;
  // liquid
  total += parseFloat(a.cash) || 0;
  total += sumField(a.bankCards || [], 'balance');
  total += sumField(a.alipayAccounts || [], 'total');
  total += (a.wechatAccounts || []).reduce(
    (s, inst) =>
      s + (parseFloat(inst.balance) || 0) + (parseFloat(inst.changeFund) || 0),
    0,
  );
  total += parseFloat(a.medicalInsurance) || 0;
  total += parseFloat(a.housingFund) || 0;
  total += sumField(a.otherAssets || [], 'balance');
  // fixed
  total += parseFloat(f.selfUse) || 0;
  total += parseFloat(f.investment) || 0;
  total += sumField(f.other || [], 'balance');
  return total;
}

function calcTotalLiabilities(snapshot) {
  if (!snapshot) return 0;
  const s = snapshot.shortLiabilities || {};
  const l = snapshot.longLiabilities || {};
  let total = 0;
  total += sumField(s.creditCards || [], 'balance');
  total += parseFloat(s.huabeiBaitiao) || 0;
  total += sumField(s.otherShort || [], 'balance');
  total += parseFloat(l.mortgage) || 0;
  total += parseFloat(l.carLoan) || 0;
  total += sumField(l.otherLong || [], 'balance');
  return total;
}

function calcNetWorth(snapshot) {
  return calcTotalAssets(snapshot) - calcTotalLiabilities(snapshot);
}

function calcLiquidAssets(snapshot) {
  if (!snapshot) return 0;
  const a = snapshot.assets || {};
  let total = 0;
  total += parseFloat(a.cash) || 0;
  total += sumField(a.bankCards || [], 'balance');
  total += sumField(a.alipayAccounts || [], 'total');
  total += (a.wechatAccounts || []).reduce(
    (s, inst) =>
      s + (parseFloat(inst.balance) || 0) + (parseFloat(inst.changeFund) || 0),
    0,
  );
  total += parseFloat(a.medicalInsurance) || 0;
  total += parseFloat(a.housingFund) || 0;
  total += sumField(a.otherAssets || [], 'balance');
  return total;
}

function calcFixedAssets(snapshot) {
  if (!snapshot) return 0;
  const f = snapshot.fixedAssets || {};
  let total = 0;
  total += parseFloat(f.selfUse) || 0;
  total += parseFloat(f.investment) || 0;
  total += sumField(f.other || [], 'balance');
  return total;
}

function calcShortLiabilities(snapshot) {
  if (!snapshot) return 0;
  const s = snapshot.shortLiabilities || {};
  let total = 0;
  total += sumField(s.creditCards || [], 'balance');
  total += parseFloat(s.huabeiBaitiao) || 0;
  total += sumField(s.otherShort || [], 'balance');
  return total;
}

function calcLongLiabilities(snapshot) {
  if (!snapshot) return 0;
  const l = snapshot.longLiabilities || {};
  let total = 0;
  total += parseFloat(l.mortgage) || 0;
  total += parseFloat(l.carLoan) || 0;
  total += sumField(l.otherLong || [], 'balance');
  return total;
}

module.exports = {
  SECTIONS,
  getItemConfig,
  getSectionByItemKey,
  createEmptySnapshot,
  calcItemTotal,
  getSnapshotField,
  setSnapshotField,
  calcTotalAssets,
  calcTotalLiabilities,
  calcNetWorth,
  calcLiquidAssets,
  calcFixedAssets,
  calcShortLiabilities,
  calcLongLiabilities,
};
