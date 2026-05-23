function drawLineChart(canvasId, dataPoints, options) {
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

    const opts = Object.assign({
      padding: { top: 30, right: 20, bottom: 40, left: 50 },
      lineColor: '#2E7D32',
      pointColor: '#2E7D32',
      gridColor: '#E8E8E8',
      textColor: '#888888',
      lineWidth: 2
    }, options)

    if (dataPoints.length < 2) {
      ctx.fillStyle = '#999999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('至少需要2条记录', width / 2, height / 2)
      return
    }

    const pad = opts.padding
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const values = dataPoints.map(d => d.value)
    const maxVal = Math.max(...values, 1)
    const minVal = Math.min(...values, 0)
    const range = maxVal - minVal || 1

    // grid lines
    ctx.strokeStyle = opts.gridColor
    ctx.lineWidth = 0.5
    const gridCount = 4
    for (let i = 0; i <= gridCount; i++) {
      const y = pad.top + (chartH / gridCount) * i
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(width - pad.right, y)
      ctx.stroke()
      ctx.fillStyle = opts.textColor
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      const val = maxVal - (range / gridCount) * i
      ctx.fillText(formatChartValue(val), pad.left - 6, y + 3)
    }

    // line
    const stepX = chartW / (dataPoints.length - 1)
    ctx.beginPath()
    ctx.strokeStyle = opts.lineColor
    ctx.lineWidth = opts.lineWidth
    ctx.lineJoin = 'round'
    dataPoints.forEach((dp, i) => {
      const x = pad.left + stepX * i
      const y = pad.top + chartH - ((dp.value - minVal) / range) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // points
    dataPoints.forEach((dp, i) => {
      const x = pad.left + stepX * i
      const y = pad.top + chartH - ((dp.value - minVal) / range) * chartH
      ctx.beginPath()
      ctx.fillStyle = opts.pointColor
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // x labels
    dataPoints.forEach((dp, i) => {
      const x = pad.left + stepX * i
      ctx.fillStyle = opts.textColor
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(dp.label, x, height - pad.bottom + 16)
    })
  })
}

function formatChartValue(val) {
  if (val >= 10000) return (val / 10000).toFixed(0) + 'w'
  return val.toFixed(0)
}

module.exports = {
  drawLineChart
}