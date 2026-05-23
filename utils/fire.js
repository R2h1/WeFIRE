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
  const sorted = [...snapshots].sort((a, b) => a.id.localeCompare(b.id))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  let monthCount = ((last.year - first.year) * 12) + (last.month - first.month)
  if (monthCount <= 0) return 0
  const netWorthChange = last.netWorth - first.netWorth
  return netWorthChange / monthCount
}

function calcProjectedYears(netWorth, monthlySavings, targetAmount) {
  if (monthlySavings <= 0 || netWorth >= targetAmount) return 0
  const remaining = targetAmount - netWorth
  return Math.ceil(remaining / (monthlySavings * 12))
}

function fillMissingMonths(snapshots) {
  if (snapshots.length < 1) return []
  const sorted = [...snapshots].sort((a, b) => a.id.localeCompare(b.id))
  const result = []
  let lastSnapshot = null
  const startDate = new Date(sorted[0].year, sorted[0].month - 1)
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth())
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    const id = year + '-' + String(month).padStart(2, '0')
    const existing = sorted.find(s => s.id === id)
    if (existing) {
      result.push(existing)
      lastSnapshot = existing
    } else if (lastSnapshot) {
      result.push({
        id: id,
        year: year,
        month: month,
        assets: lastSnapshot.assets,
        liabilities: lastSnapshot.liabilities,
        netWorth: lastSnapshot.netWorth,
        createdAt: lastSnapshot.createdAt,
        filled: true
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
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
  formatMoney
}
