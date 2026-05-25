const config = require('./config')

function calcNetWorth(assets, liabilities) {
  return (assets || 0) - (liabilities || 0)
}

function calcProgress(netWorth, targetAmount) {
  if (!targetAmount || targetAmount <= 0) return 0
  if (netWorth <= 0) return 0
  const progress = netWorth / targetAmount
  return Math.min(progress, 1)
}

function calcMonthlySavings(snapshots) {
  if (snapshots.length < 2) return 0
  const sorted = [...snapshots].sort((a, b) => getSnapshotId(a).localeCompare(getSnapshotId(b)))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const firstParts = first.month.split('-')
  const lastParts = last.month.split('-')
  let monthCount = ((parseInt(lastParts[0]) - parseInt(firstParts[0])) * 12) + (parseInt(lastParts[1]) - parseInt(firstParts[1]))
  if (monthCount <= 0) return 0
  const netWorthChange = last.netWorth - first.netWorth
  return netWorthChange / monthCount
}

function calcProjectedYears(netWorth, monthlySavings, targetAmount) {
  if (monthlySavings <= 0 || netWorth >= targetAmount) return 0
  const remaining = targetAmount - netWorth
  return Math.ceil(remaining / (monthlySavings * 12))
}

function getSnapshotId(s) {
  return s.id || s.month || ''
}

function fillMissingMonths(snapshots) {
  if (snapshots.length < 1) return []
  const sorted = [...snapshots].sort((a, b) => getSnapshotId(a).localeCompare(getSnapshotId(b)))
  const result = []
  let lastSnapshot = null
  const firstParts = sorted[0].month.split('-')
  const startDate = new Date(parseInt(firstParts[0]), parseInt(firstParts[1]) - 1)
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth())
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    const monthId = year + '-' + String(month).padStart(2, '0')
    const existing = sorted.find(s => getSnapshotId(s) === monthId)
    if (existing) {
      result.push(existing)
      lastSnapshot = existing
    } else if (lastSnapshot) {
      const totals = config.calcTotalAssets(lastSnapshot)
      const totalLiab = config.calcTotalLiabilities(lastSnapshot)
      result.push({
        id: monthId,
        month: monthId,
        year: year,
        month: month,
        assets: totals,
        liabilities: totalLiab,
        netWorth: lastSnapshot.netWorth,
        createdAt: lastSnapshot.createdAt,
        filled: true
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}

function calcSnapshotTotals(snapshot) {
  if (!snapshot) return { assets: 0, liabilities: 0 }
  return {
    assets: config.calcTotalAssets(snapshot) || snapshot.assets || 0,
    liabilities: config.calcTotalLiabilities(snapshot) || snapshot.liabilities || 0
  }
}

function formatMoney(amount) {
  if (amount == null) return '¥0'
  if (Math.abs(amount) >= 100000000) {
    return '¥' + (amount / 100000000).toFixed(2) + '亿'
  }
  if (Math.abs(amount) >= 10000) {
    return '¥' + (amount / 10000).toFixed(1) + '万'
  }
  return '¥' + amount.toLocaleString('zh-CN')
}

module.exports = {
  calcNetWorth,
  calcProgress,
  calcMonthlySavings,
  calcProjectedYears,
  fillMissingMonths,
  formatMoney,
  calcSnapshotTotals
}
