import { useState, useRef } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { Badge } from '@/components/ui/Badge'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DonutChart } from '@/components/charts/DonutChart'
import { COMPANY_CONFIG } from '@/config/company'
import { ALL_HISTORIES, getOEEStats } from '@/data/mockSensors'
import { FileText, Download, FileSpreadsheet, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'

type ReportType = 'oee' | 'energy' | 'maintenance' | 'production'

const REPORT_TYPES = [
  { id: 'oee'         as ReportType, label: 'OEE Mensual',       icon: '📊' },
  { id: 'energy'      as ReportType, label: 'Consumo Energético', icon: '⚡' },
  { id: 'maintenance' as ReportType, label: 'Mantenimiento',      icon: '🔧' },
  { id: 'production'  as ReportType, label: 'Producción',         icon: '🏭' },
]

function OEEReport() {
  const data = COMPANY_CONFIG.machines.map(m => {
    const s = getOEEStats(m.id)
    return { machine: m.name.split(' ').slice(0, 2).join(' '), ...s }
  })
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {['OEE', 'Disponibilidad', 'Rendimiento'].map(label => (
          <GlassCard key={label} padding="sm">
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>
              {Math.round(data.reduce((s, d) => s + (label === 'OEE' ? d.oee : label === 'Disponibilidad' ? d.availability : d.performance), 0) / data.length)}%
            </div>
          </GlassCard>
        ))}
      </div>
      <BarChartWidget
        data={data.map(d => ({ machine: d.machine, oee: d.oee }))}
        xKey="machine" valueKey="oee"
        color="var(--primary)" reference={COMPANY_CONFIG.kpis.oeeTarget}
        height={200}
      />
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Equipo', 'OEE', 'Disponibilidad', 'Rendimiento', 'Calidad', 'Estado'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{d.machine}</td>
                <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: d.oee >= COMPANY_CONFIG.kpis.oeeTarget ? 'var(--success)' : 'var(--danger)' }}>{d.oee}%</td>
                <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{d.availability}%</td>
                <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{d.performance}%</td>
                <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{d.quality}%</td>
                <td style={{ padding: '9px 10px' }}><Badge variant={d.oee >= COMPANY_CONFIG.kpis.oeeTarget ? 'ok' : 'warning'}>{d.oee >= COMPANY_CONFIG.kpis.oeeTarget ? 'META OK' : 'BAJO META'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EnergyReport() {
  const data = COMPANY_CONFIG.machines.map(m => {
    const readings = ALL_HISTORIES[m.id].readings.slice(-30)
    const total    = readings.reduce((s, r) => s + r.energy, 0)
    return { area: m.area, name: m.name.split(' ').slice(0, 2).join(' '), kwh: Math.round(total) }
  })
  const totalKwh = data.reduce((s, d) => s + d.kwh, 0)
  const costPerKwh = 2.45  // MXN
  const donutData = [
    { name: 'Línea A', value: data.filter(d => d.area === 'Línea A').reduce((s, d) => s + d.kwh, 0), color: 'var(--primary)' },
    { name: 'Línea B', value: data.filter(d => d.area === 'Línea B').reduce((s, d) => s + d.kwh, 0), color: 'var(--accent)' },
    { name: 'Línea C', value: data.filter(d => d.area === 'Línea C').reduce((s, d) => s + d.kwh, 0), color: 'var(--warning)' },
    { name: 'Ensamble', value: data.filter(d => d.area === 'Ensamble').reduce((s, d) => s + d.kwh, 0), color: 'var(--success)' },
  ].filter(d => d.value > 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total kWh (30d)', value: totalKwh.toLocaleString(), unit: 'kWh' },
            { label: 'Costo estimado',  value: `$${(totalKwh * costPerKwh / 1000).toFixed(1)}k`, unit: 'MXN' },
            { label: 'Prom. diario',    value: Math.round(totalKwh / 30), unit: 'kWh/día' },
          ].map(({ label, value, unit }) => (
            <GlassCard key={label} padding="sm">
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>{unit}</div>
            </GlassCard>
          ))}
        </div>
        <BarChartWidget data={data} xKey="name" valueKey="kwh" color="var(--accent)" height={180} />
      </div>
      <DonutChart data={donutData} size={160} label="kWh" />
    </div>
  )
}

function ProductionReport() {
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - (7 - i) * 7)
    const total = COMPANY_CONFIG.machines.reduce((sum, m) => {
      const week = ALL_HISTORIES[m.id].readings.slice(-((8 - i) * 7), -((7 - i) * 7))
      return sum + week.reduce((s, r) => s + r.production, 0)
    }, 0)
    return { semana: `Sem ${i + 1}`, unidades: total }
  })
  const totalUnits = weeklyData.reduce((s, d) => s + d.unidades, 0)
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total 8 semanas', value: totalUnits.toLocaleString(), color: 'var(--primary)' },
          { label: 'Promedio semanal', value: Math.round(totalUnits / 8).toLocaleString(), color: 'var(--accent)' },
          { label: 'Objetivo semanal', value: (COMPANY_CONFIG.kpis.pphTarget * 8 * 5 * COMPANY_CONFIG.machines.length).toLocaleString(), color: 'var(--success)' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} padding="sm">
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </GlassCard>
        ))}
      </div>
      <BarChartWidget data={weeklyData} xKey="semana" valueKey="unidades" color="var(--primary)" height={200} />
    </div>
  )
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('oee')
  const [dateRange,  setDateRange]  = useState({ from: '2026-04-01', to: '2026-04-30' })
  const previewRef = useRef<HTMLDivElement>(null)

  const exportPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const typeLabel = REPORT_TYPES.find(t => t.id === reportType)?.label ?? ''

    doc.setFillColor(10, 15, 30)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setTextColor(240, 245, 250)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(COMPANY_CONFIG.name, 20, 30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 180, 200)
    doc.text(`Reporte: ${typeLabel}`, 20, 40)
    doc.text(`Período: ${dateRange.from} — ${dateRange.to}`, 20, 48)
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 20, 56)
    doc.setDrawColor(14, 165, 233)
    doc.line(20, 63, 190, 63)

    doc.setTextColor(200, 220, 240)
    doc.setFontSize(10)
    doc.text(`Datos generados automáticamente por el sistema de monitoreo industrial.`, 20, 75)

    const machines = COMPANY_CONFIG.machines
    let y = 90
    doc.setFontSize(9)
    machines.forEach(m => {
      const s = getOEEStats(m.id)
      doc.setTextColor(180, 200, 220)
      doc.text(`${m.name} (${m.area})`, 20, y)
      doc.setTextColor(14, 165, 233)
      doc.text(`OEE: ${s.oee}%  Disp: ${s.availability}%  Rend: ${s.performance}%  Cal: ${s.quality}%`, 80, y)
      y += 8
    })

    doc.setFontSize(8)
    doc.setTextColor(100, 120, 140)
    doc.text(`${COMPANY_CONFIG.name} — Reporte confidencial`, 20, 280)
    doc.text(`Página 1 de 1`, 180, 280)

    doc.save(`reporte-${reportType}-${dateRange.from}.pdf`)
  }

  const exportExcel = () => {
    import('xlsx').then(XLSX => {
      const data = COMPANY_CONFIG.machines.map(m => {
        const s = getOEEStats(m.id)
        const hist = ALL_HISTORIES[m.id].readings.slice(-30)
        return {
          'Equipo':        m.name,
          'Área':          m.area,
          'OEE (%)':       s.oee,
          'Disponibilidad (%)': s.availability,
          'Rendimiento (%)':    s.performance,
          'Calidad (%)':        s.quality,
          'Producción 30d': hist.reduce((s, r) => s + r.production, 0),
          'Energía 30d (kWh)': Math.round(hist.reduce((s, r) => s + r.energy, 0)),
        }
      })
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
      XLSX.writeFile(wb, `reporte-${reportType}-${dateRange.from}.xlsx`)
    })
  }

  return (
    <PageWrapper title="Generador de Reportes">
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        {REPORT_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: reportType === t.id ? 'var(--primary-dim)' : 'var(--bg-surface)',
              border: `1px solid ${reportType === t.id ? 'rgba(14,165,233,0.40)' : 'var(--border-glass)'}`,
              color: reportType === t.id ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <Calendar size={13} color="var(--text-muted)" />
          <input type="date" value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: 7, color: 'var(--text-primary)', padding: '5px 10px', fontSize: 11, fontFamily: 'inherit' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: 7, color: 'var(--text-primary)', padding: '5px 10px', fontSize: 11, fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Preview */}
      <GlassCard padding="lg" className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={16} color="var(--primary)" />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                {REPORT_TYPES.find(t => t.id === reportType)?.label}
              </span>
              <Badge variant="info">PREVIEW</Badge>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {COMPANY_CONFIG.name} — {dateRange.from} a {dateRange.to}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <GlassButton icon={<Download size={13} />} variant="primary" size="sm" onClick={exportPDF}>
              PDF
            </GlassButton>
            <GlassButton icon={<FileSpreadsheet size={13} />} variant="ghost" size="sm" onClick={exportExcel}>
              Excel
            </GlassButton>
          </div>
        </div>

        <div ref={previewRef}>
          {reportType === 'oee'         && <OEEReport />}
          {reportType === 'energy'      && <EnergyReport />}
          {reportType === 'production'  && <ProductionReport />}
          {reportType === 'maintenance' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Ver módulo de Mantenimiento para detalles completos</div>
            </div>
          )}
        </div>
      </GlassCard>
    </PageWrapper>
  )
}
