function drawLineChart(canvasId, dataPoints) {
  const query = wx.createSelectorQuery()
  query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0]) return
    const canvas = res[0].node
    const ctx = canvas.getContext('2d')
    const dpr = wx.getSystemInfoSync().pixelRatio
    const width = res[0].width
    const height = res[0].height
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    if (dataPoints.length < 2) {
      ctx.fillStyle = '#999999'
      ctx.font = '14px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('至少需要2条记录', width / 2, height / 2)
      return
    }

    const pad = { top: 24, right: 16, bottom: 32, left: 52 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const values = dataPoints.map(d => d.value)
    const maxVal = Math.max(...values, 1)
    const minVal = Math.min(...values, 0)
    const range = maxVal - minVal || 1
    const stepX = chartW / (Math.max(dataPoints.length - 1, 1))

    // Helper: map data to pixel coords
    function toX(i) { return pad.left + stepX * i }
    function toY(v) { return pad.top + chartH - ((v - minVal) / range) * chartH }

    // --- Horizontal grid lines (subtle) ---
    ctx.strokeStyle = '#F0F0F0'
    ctx.lineWidth = 1
    const gridCount = 3
    for (let i = 0; i <= gridCount; i++) {
      const y = pad.top + (chartH / gridCount) * i
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(width - pad.right, y)
      ctx.stroke()

      // Y-axis labels
      const val = maxVal - (range / gridCount) * i
      ctx.fillStyle = '#AAAAAA'
      ctx.font = '10px -apple-system, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(formatChartValue(val), pad.left - 8, y)
    }

    // --- Gradient fill under line ---
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
    gradient.addColorStop(0, 'rgba(46, 125, 50, 0.15)')
    gradient.addColorStop(1, 'rgba(46, 125, 50, 0.01)')

    ctx.beginPath()
    ctx.moveTo(toX(0), pad.top + chartH)
    dataPoints.forEach((dp, i) => {
      const x = toX(i)
      const y = toY(dp.value)
      if (i === 0) ctx.lineTo(x, y)
      else {
        // Smooth curve
        const prevX = toX(i - 1)
        const prevY = toY(dataPoints[i - 1].value)
        const cpx = (prevX + x) / 2
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
      }
    })
    ctx.lineTo(toX(dataPoints.length - 1), pad.top + chartH)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // --- Line ---
    ctx.beginPath()
    ctx.strokeStyle = '#2E7D32'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    dataPoints.forEach((dp, i) => {
      const x = toX(i)
      const y = toY(dp.value)
      if (i === 0) ctx.moveTo(x, y)
      else {
        const prevX = toX(i - 1)
        const prevY = toY(dataPoints[i - 1].value)
        const cpx = (prevX + x) / 2
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
      }
    })
    ctx.stroke()

    // --- Data points ---
    dataPoints.forEach((dp, i) => {
      const x = toX(i)
      const y = toY(dp.value)

      // White outer circle
      ctx.beginPath()
      ctx.fillStyle = '#FFFFFF'
      ctx.arc(x, y, 4.5, 0, Math.PI * 2)
      ctx.fill()

      // Green inner dot
      ctx.beginPath()
      ctx.fillStyle = '#2E7D32'
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // --- X-axis labels ---
    ctx.textBaseline = 'top'
    // Show at most 6 labels to avoid crowding
    const labelInterval = Math.max(1, Math.floor(dataPoints.length / 6))
    dataPoints.forEach((dp, i) => {
      if (i % labelInterval !== 0 && i !== dataPoints.length - 1) return
      const x = toX(i)
      ctx.fillStyle = '#AAAAAA'
      ctx.font = '10px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(dp.label, x, pad.top + chartH + 8)
    })
  })
}

function formatChartValue(val) {
  if (val >= 100000000) return (val / 100000000).toFixed(1) + '亿'
  if (val >= 10000) return (val / 10000).toFixed(0) + '万'
  return val.toFixed(0)
}

module.exports = {
  drawLineChart
}
