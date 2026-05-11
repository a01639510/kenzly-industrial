import { useState, useRef } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { Badge } from '@/components/ui/Badge'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DonutChart } from '@/components/charts/DonutChart'
import { COMPANY_CONFIG, type Machine } from '@/config/company'
import { ALL_HISTORIES, getOEEStats } from '@/data/mockSensors'
import { FileText, Download, FileSpreadsheet, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'

type ReportType = 'oee' | 'energy' | 'maintenance' | 'production'

const AREA_COLORS: Record<string, string> = {
  'Línea A':  'var(--primary)',
  'Línea B':  'var(--accent)',
  'Línea C':  'var(--warning)',
  'Ensamble': 'var(--success)',
}
const MACHINE_COLORS = ['var(--primary)', 'var(--accent)', 'var(--warning)', 'var(--success)', 'var(--danger)', '#a78bfa']

const REPORT_TYPES = [
  { id: 'oee'         as ReportType, label: 'OEE Mensual',       icon: '📊' },
  { id: 'energy'      as ReportType, label: 'Consumo Energético', icon: '⚡' },
  { id: 'maintenance' as ReportType, label: 'Mantenimiento',      icon: '🔧' },
  { id: 'production'  as ReportType, label: 'Producción',         icon: '🏭' },
]

function OEEReport({ machines }: { machines: readonly Machine[] }) {
  const data = machines.map(m => {
    const s = getOEEStats(m.id)
    return { machine: m.name.split(' ').slice(0, 2).join(' '), ...s }
  })
  const avg = (key: 'oee' | 'availability' | 'performance') =>
    data.length ? Math.round(data.reduce((s, d) => s + d[key], 0) / data.length) : 0

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Sin equipos en esta área</div>
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'OEE',           value: avg('oee') },
          { label: 'Disponibilidad', value: avg('availability') },
          { label: 'Rendimiento',    value: avg('performance') },
        ].map(({ label, value }) => (
          <GlassCard key={label} padding="sm">
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{value}%</div>
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

function EnergyReport({ machines, selectedArea }: { machines: readonly Machine[], selectedArea: string }) {
  const data = machines.map((m, i) => {
    const readings = ALL_HISTORIES[m.id].readings.slice(-30)
    const total = readings.reduce((s, r) => s + r.energy, 0)
    return { area: m.area, name: m.name.split(' ').slice(0, 2).join(' '), kwh: Math.round(total), color: MACHINE_COLORS[i % MACHINE_COLORS.length] }
  })
  const totalKwh = data.reduce((s, d) => s + d.kwh, 0)
  const costPerKwh = 2.45

  // "Todas" → group by area; specific area → show per-machine
  const donutData = selectedArea === 'Todas'
    ? Object.entries(
        data.reduce((acc, d) => { acc[d.area] = (acc[d.area] || 0) + d.kwh; return acc }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value, color: AREA_COLORS[name] ?? 'var(--accent)' })).filter(d => d.value > 0)
    : data.map(d => ({ name: d.name, value: d.kwh, color: d.color })).filter(d => d.value > 0)

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Sin equipos en esta área</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total kWh (30d)', value: totalKwh.toLocaleString(), unit: 'kWh' },
            { label: 'Costo estimado',  value: `$${(totalKwh * costPerKwh / 1000).toFixed(1)}k`, unit: 'MXN' },
            { label: 'Prom. diario',    value: totalKwh > 0 ? Math.round(totalKwh / 30).toLocaleString() : '0', unit: 'kWh/día' },
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

function ProductionReport({ machines }: { machines: readonly Machine[] }) {
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const total = machines.reduce((sum, m) => {
      const week = ALL_HISTORIES[m.id].readings.slice(-((8 - i) * 7), -((7 - i) * 7))
      return sum + week.reduce((s, r) => s + r.production, 0)
    }, 0)
    return { semana: `Sem ${i + 1}`, unidades: total }
  })
  const totalUnits = weeklyData.reduce((s, d) => s + d.unidades, 0)
  const weeklyTarget = machines.length * COMPANY_CONFIG.kpis.pphTarget * 8 * 5

  if (machines.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Sin equipos en esta área</div>
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total 8 semanas',  value: totalUnits.toLocaleString(),              color: 'var(--primary)' },
          { label: 'Promedio semanal', value: Math.round(totalUnits / 8).toLocaleString(), color: 'var(--accent)' },
          { label: 'Objetivo semanal', value: weeklyTarget.toLocaleString(),             color: 'var(--success)' },
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
  const [reportType,   setReportType]   = useState<ReportType>('oee')
  const [selectedArea, setSelectedArea] = useState<string>('Todas')
  const [dateRange,    setDateRange]    = useState({ from: '2026-04-01', to: '2026-04-30' })
  const previewRef = useRef<HTMLDivElement>(null)

  const AREAS = ['Todas', ...Array.from(new Set(COMPANY_CONFIG.machines.map(m => m.area)))]
  const filteredMachines = selectedArea === 'Todas'
    ? COMPANY_CONFIG.machines
    : COMPANY_CONFIG.machines.filter(m => m.area === selectedArea)

  const exportPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const typeLabel = REPORT_TYPES.find(t => t.id === reportType)?.label ?? ''
    const areaLabel = selectedArea === 'Todas' ? 'Todas las áreas' : selectedArea

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
    doc.text(`Área: ${areaLabel}`, 20, 48)
    doc.text(`Período: ${dateRange.from} — ${dateRange.to}`, 20, 56)
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 20, 64)
    doc.setDrawColor(26, 109, 255)
    doc.line(20, 71, 190, 71)

    doc.setTextColor(200, 220, 240)
    doc.setFontSize(10)
    doc.text(`Datos generados automáticamente por el sistema de monitoreo industrial.`, 20, 83)

    let y = 96
    doc.setFontSize(9)
    filteredMachines.forEach(m => {
      const s = getOEEStats(m.id)
      doc.setTextColor(180, 200, 220)
      doc.text(`${m.name} (${m.area})`, 20, y)
      doc.setTextColor(26, 109, 255)
      doc.text(`OEE: ${s.oee}%  Disp: ${s.availability}%  Rend: ${s.performance}%  Cal: ${s.quality}%`, 80, y)
      y += 8
    })

    doc.setFontSize(8)
    doc.setTextColor(100, 120, 140)
    doc.text(`${COMPANY_CONFIG.name} — Reporte confidencial`, 20, 280)
    doc.text(`Página 1 de 1`, 180, 280)

    doc.save(`reporte-${reportType}-${selectedArea === 'Todas' ? 'todas' : selectedArea.replace(/ /g, '-')}-${dateRange.from}.pdf`)
  }

  const exportExcel = () => {
    import('xlsx').then(XLSX => {
      const data = filteredMachines.map(m => {
        const s    = getOEEStats(m.id)
        const hist = ALL_HISTORIES[m.id].readings.slice(-30)
        return {
          'Equipo':              m.name,
          'Área':                m.area,
          'OEE (%)':             s.oee,
          'Disponibilidad (%)':  s.availability,
          'Rendimiento (%)':     s.performance,
          'Calidad (%)':         s.quality,
          'Producción 30d':      hist.reduce((s, r) => s + r.production, 0),
          'Energía 30d (kWh)':   Math.round(hist.reduce((s, r) => s + r.energy, 0)),
        }
      })
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
      XLSX.writeFile(wb, `reporte-${reportType}-${selectedArea === 'Todas' ? 'todas' : selectedArea.replace(/ /g, '-')}-${dateRange.from}.xlsx`)
    })
  }

  return (
    <PageWrapper title="Generador de Reportes">
      {/* Report type + date controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {REPORT_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: reportType === t.id ? 'var(--primary-dim)' : 'var(--bg-surface)',
              border: `1px solid ${reportType === t.id ? 'rgba(26,109,255,0.40)' : 'var(--border-glass)'}`,
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

      {/* Area filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Área:
        </span>
        {AREAS.map(area => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            style={{
              padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: selectedArea === area ? 'var(--accent-dim)' : 'var(--bg-surface)',
              border: `1px solid ${selectedArea === area ? 'rgba(143,170,200,0.40)' : 'var(--border-glass)'}`,
              color: selectedArea === area ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {area}
          </button>
        ))}
        {selectedArea !== 'Todas' && (
          <Badge variant="info">{filteredMachines.length} equipo{filteredMachines.length !== 1 ? 's' : ''}</Badge>
        )}
      </div>

      {/* Preview */}
      <GlassCard padding="lg" className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <FileText size={16} color="var(--primary)" />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                {REPORT_TYPES.find(t => t.id === reportType)?.label}
              </span>
              <Badge variant="info">PREVIEW</Badge>
              {selectedArea !== 'Todas' && <Badge variant="warning">{selectedArea}</Badge>}
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
          {reportType === 'oee'         && <OEEReport machines={filteredMachines} />}
          {reportType === 'energy'      && <EnergyReport machines={filteredMachines} selectedArea={selectedArea} />}
          {reportType === 'production'  && <ProductionReport machines={filteredMachines} />}
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
