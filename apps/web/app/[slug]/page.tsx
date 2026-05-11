"use client"
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import DynamicRenderer from '../../components/DynamicRenderer';
import AlertsOverlay, { useAlerts } from '../../components/AlertsOverlay';
import { useTenant } from '../../contexts/TenantContext';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const params = useParams();
  const slug   = params.slug as string;
  const { manifest, primaryColor, selectedAreaId, activeAssets } = useTenant();

  const [view, setView]                 = useState<'operator' | 'analyst'>('operator');
  const [telemetry, setTelemetry]       = useState<Record<string, any>>({});
  const [historyData, setHistoryData]   = useState<Record<string, any[]>>({});
  const [currentShift, setCurrentShift] = useState<{ name: string } | null>(null);
  const [historyHours, setHistoryHours] = useState(48);
  const [isOffline, setIsOffline]       = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const telemetryLoaded                 = useRef(false);

  const fetchAllTelemetry = useCallback(async () => {
    if (!manifest?.areas) return;
    const newTelemetry: Record<string, any>   = {};
    const newHistory: Record<string, any[]>   = {};
    const promises: Promise<any>[]            = [];

    for (const areaId in manifest.areas) {
      const widgets = manifest.areas[areaId][view]?.widgets ?? [];
      for (const w of widgets) {
        const { assetId, key, subKey } = w.props ?? {};
        if (!assetId || !key) continue;
        const wKey = `${assetId}-${key}`;

        promises.push(
          api.telemetry.latest(assetId, key)
            .then(d => { if (d) newTelemetry[wKey] = d; })
            .catch(() => {})
        );

        if (w.type === 'PRODUCTION_PER_HOUR') {
          promises.push(
            api.telemetry.history(assetId, key, historyHours, subKey)
              .then(d => { newHistory[wKey] = d; })
              .catch(() => {})
          );
        }
      }
    }

    await Promise.all(promises);
    setTelemetry(prev => ({ ...prev, ...newTelemetry }));
    setHistoryData(prev => ({ ...prev, ...newHistory }));
    telemetryLoaded.current = true;
    setIsOffline(false);
    setLastUpdated(new Date());
  }, [manifest, view, historyHours]);

  useEffect(() => {
    if (!manifest) return;
    fetchAllTelemetry();
    const id = setInterval(async () => {
      try { await fetchAllTelemetry(); }
      catch { if (telemetryLoaded.current) setIsOffline(true); }
    }, 10_000);
    return () => clearInterval(id);
  }, [fetchAllTelemetry]);

  useEffect(() => {
    if (manifest && view === 'analyst') fetchAllTelemetry();
  }, [historyHours]);

  useEffect(() => {
    if (!slug) return;
    const load = () =>
      api.tenant.currentShift(slug).then(setCurrentShift).catch(() => {});
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, [slug]);

  const activeAlerts = useAlerts(manifest, telemetry, view);

  if (!manifest) return null;

  return (
    <div style={{ padding: 24 }}>
      {/* Offline banner */}
      {isOffline && (
        <div style={offlineBanner}>
          ⚠ SIN CONEXIÓN — ÚLTIMO DATO: {lastUpdated?.toLocaleTimeString() ?? '—'}
        </div>
      )}

      {/* Dashboard controls */}
      <div style={controlsBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {currentShift && (
            <span style={shiftBadge}>TURNO: {currentShift.name.toUpperCase()}</span>
          )}
          {activeAlerts.length > 0 && (
            <span style={alertBadge}>⚠ {activeAlerts.length} ALERTA{activeAlerts.length > 1 ? 'S' : ''}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={viewToggle}>
            {(['operator', 'analyst'] as const).map(v => (
              <button
                key={v}
                style={viewBtn(view === v, primaryColor)}
                onClick={() => setView(v)}
              >
                {v === 'operator' ? 'OPERADOR' : 'ANALISTA'}
              </button>
            ))}
          </div>

          {/* History range (analyst only) */}
          {view === 'analyst' && (
            <div style={viewToggle}>
              {[6, 24, 48, 168].map(h => (
                <button
                  key={h}
                  style={viewBtn(historyHours === h, primaryColor)}
                  onClick={() => setHistoryHours(h)}
                >
                  {h < 24 ? `${h}H` : h === 168 ? '7D' : `${h}H`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertsOverlay alerts={activeAlerts} />

      {/* Widget areas */}
      {Object.entries(manifest.areas ?? {})
        .filter(([id]) => !selectedAreaId || id === selectedAreaId)
        .map(([id, area]: any) => {
          const widgets = area[view]?.widgets ?? [];
          const kanbanWidgets = widgets.filter((w: any) => w.type === 'KANBAN');
          const otherWidgets  = widgets.filter((w: any) =>
            w.type !== 'KANBAN' &&
            (w.type === 'DAILY_EXECUTIVE_REPORT' ||
             activeAssets.length === 0 ||
             activeAssets.includes(w.props?.assetId))
          );
          if (!kanbanWidgets.length && !otherWidgets.length) return null;

          return (
            <section key={id} style={{ marginBottom: 32 }}>
              {/* Area heading */}
              <div style={sectionHeader}>
                <h2 style={sectionTitle}>{area.name.toUpperCase()}</h2>
                <div style={sectionLine} />
              </div>

              {/* Kanban row */}
              {kanbanWidgets.length > 0 && (
                <div style={kanbanGrid}>
                  {kanbanWidgets.map((w: any) => (
                    <div key={w.id} style={widgetCard}>
                      <DynamicRenderer
                        widget={w}
                        color={primaryColor}
                        telemetryData={telemetry[`${w.props.assetId}-${w.props.key}`]}
                        allWidgets={widgets}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Regular widget grid */}
              <div style={widgetGrid}>
                {otherWidgets.map((w: any) => {
                  const wKey     = `${w.props.assetId}-${w.props.key}`;
                  const hasAlert = activeAlerts.some(a => a.widgetId === w.id);
                  return (
                    <div key={w.id} style={{ ...widgetCard, ...(hasAlert ? alertCard : {}) }}>
                      {!telemetryLoaded.current ? (
                        <div className="widget-skeleton" style={{ width: '100%', height: 120 }} />
                      ) : (
                        <DynamicRenderer
                          widget={w}
                          color={primaryColor}
                          telemetryData={telemetry[wKey]}
                          history={historyData[wKey] ?? []}
                          allWidgets={widgets}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const offlineBanner: React.CSSProperties = {
  background: 'rgba(251,191,36,0.12)', color: '#fbbf24', borderRadius: 10,
  padding: '8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  marginBottom: 16, border: '1px solid rgba(251,191,36,0.25)',
};

const controlsBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 20, gap: 12, flexWrap: 'wrap',
};

const shiftBadge: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.50)',
  background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 20, letterSpacing: 1,
  border: '1px solid rgba(255,255,255,0.12)',
};

const alertBadge: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: '#fbbf24',
  background: 'rgba(251,191,36,0.12)', padding: '4px 10px', borderRadius: 20, letterSpacing: 1,
  border: '1px solid rgba(251,191,36,0.20)',
};

const viewToggle: React.CSSProperties = {
  display: 'flex', background: 'rgba(255,255,255,0.07)',
  borderRadius: 9, padding: 3, gap: 2,
  border: '1px solid rgba(255,255,255,0.10)',
};

const viewBtn = (active: boolean, primary: string): React.CSSProperties => ({
  padding: '5px 12px', border: 'none', borderRadius: 7, cursor: 'pointer',
  fontSize: 9, fontWeight: 800, letterSpacing: 0.5, transition: 'all 0.15s',
  background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
  color: active ? primary : 'rgba(255,255,255,0.40)',
  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
  fontFamily: 'inherit',
});

const sectionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)',
  letterSpacing: 2, whiteSpace: 'nowrap',
};

const sectionLine: React.CSSProperties = {
  flex: 1, height: 1, background: 'rgba(255,255,255,0.07)',
};

const widgetGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16,
};

const kanbanGrid: React.CSSProperties = {
  display: 'flex', gap: 16, marginBottom: 16, overflowX: 'auto', paddingBottom: 4,
};

const widgetCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.75)',
  padding: 22,
  boxShadow: '0 4px 24px rgba(80,90,160,0.10), 0 1px 0 rgba(255,255,255,0.80) inset',
  transition: 'transform 0.15s, box-shadow 0.15s',
};

const alertCard: React.CSSProperties = {
  border: '1px solid rgba(239,68,68,0.45)',
  boxShadow: '0 0 0 3px rgba(239,68,68,0.08)',
};
