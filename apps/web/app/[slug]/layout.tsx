"use client"
import React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { TenantProvider, useTenant } from '../../contexts/TenantContext';
import Sidebar from '../../components/layout/Sidebar';
import DowntimeModal from '../../components/DowntimeModal';
import ScrapModal from '../../components/ScrapModal';

const PAGE_TITLES: Record<string, string> = {
  '':              'Dashboard',
  '/ordenes':      'Órdenes de Producción',
  '/oee':          'OEE — Efectividad Global',
  '/calidad':      'Calidad / Scrap',
  '/paros':        'Registro de Paros',
  '/mantenimiento':'Mantenimiento Preventivo',
};

function TenantShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const {
    primaryColor, manifest, loadingManifest, clock,
    activeDowntime, refreshDowntime,
    downtimeModalOpen, openDowntimeModal, closeDowntimeModal,
    scrapModalOpen, openScrapModal, closeScrapModal,
    selectedAreaId, allAssets,
  } = useTenant();
  const pathname = usePathname();
  const router   = useRouter();

  const moduleKey  = pathname.replace(`/${slug}`, '') || '';
  const pageTitle  = PAGE_TITLES[moduleKey] ?? 'Dashboard';

  if (loadingManifest) {
    return (
      <div style={loadingWrap}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[200, 160, 220].map((w, i) => (
            <div key={i} className="widget-skeleton" style={{ width: w, height: 120, borderRadius: 12 }} />
          ))}
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5 }}>
          CARGANDO ENTORNO...
        </p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div style={loadingWrap}>
        <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
          No se pudo cargar la configuración.{' '}
          <button
            onClick={() => router.push(`/login/${slug}`)}
            style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}
          >
            Volver al login
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif",
      background: [
        'radial-gradient(ellipse 60% 75% at 12% 98%, #5a72c8 0%, transparent 62%)',
        'radial-gradient(ellipse 38% 48% at 20% 62%, #8090d8 0%, transparent 55%)',
        'radial-gradient(ellipse 30% 30% at 5%  40%, #9098d0 0%, transparent 50%)',
        '#ece6db',
      ].join(', '),
    }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* ── Top bar ── */}
        <header style={topBarStyle}>
          <h1 style={pageTitleStyle}>{pageTitle}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* SCRAP */}
            <button style={actionBtnStyle('#64748b')} onClick={openScrapModal}>
              ✕ SCRAP
            </button>

            {/* PARO */}
            <button
              style={actionBtnStyle(activeDowntime ? '#ef4444' : '#64748b', !!activeDowntime)}
              onClick={openDowntimeModal}
              className={activeDowntime ? 'kenzly-downtime-btn active' : 'kenzly-downtime-btn'}
            >
              {activeDowntime ? '⏸ PARO ACTIVO' : '+ PARO'}
            </button>

            {/* Clock */}
            <span style={clockStyle}>{clock}</span>
          </div>
        </header>

        {/* ── Content area ── */}
        <main style={{ flex: 1, overflow: 'auto', background: 'transparent' }}>
          {children}
        </main>
      </div>

      {/* Global modals */}
      <ScrapModal
        open={scrapModalOpen}
        onClose={closeScrapModal}
        assets={allAssets}
        areaId={selectedAreaId ?? undefined}
        primaryColor={primaryColor}
      />
      <DowntimeModal
        open={downtimeModalOpen}
        onClose={closeDowntimeModal}
        assets={allAssets}
        areaId={selectedAreaId ?? undefined}
        primaryColor={primaryColor}
        activeEvent={activeDowntime}
        onEventChange={refreshDowntime}
      />
    </div>
  );
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug   = params.slug as string;
  return (
    <TenantProvider slug={slug}>
      <TenantShell slug={slug}>{children}</TenantShell>
    </TenantProvider>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const loadingWrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: '#ece6db', fontFamily: 'system-ui, sans-serif',
  color: '#1e293b',
};

const topBarStyle: React.CSSProperties = {
  height: 56,
  background: 'rgba(255,255,255,0.60)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderBottom: '1px solid rgba(0,0,0,0.07)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  flexShrink: 0,
  gap: 16,
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: -0.2,
};

const clockStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(15,23,42,0.40)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 0.5,
  minWidth: 70,
  textAlign: 'right',
};

const actionBtnStyle = (color: string, active = false): React.CSSProperties => ({
  padding: '6px 12px',
  border: `1px solid ${active ? color + '50' : 'rgba(0,0,0,0.12)'}`,
  borderRadius: 8,
  background: active ? color + '18' : 'rgba(0,0,0,0.05)',
  color: active ? color : 'rgba(15,23,42,0.50)',
  cursor: 'pointer',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.5,
  transition: 'all 0.2s',
  fontFamily: 'inherit',
});
