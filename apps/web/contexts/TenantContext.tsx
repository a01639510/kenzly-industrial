"use client"
import React, {
  createContext, useContext, useEffect, useState, useCallback, useMemo
} from 'react';
import { api } from '../lib/api';

interface TenantContextValue {
  slug: string;
  tenantData: any;
  manifest: any;
  primaryColor: string;
  tenantName: string;
  loadingManifest: boolean;
  clock: string;
  // Downtime
  activeDowntime: any;
  refreshDowntime: () => void;
  // Global modals
  downtimeModalOpen: boolean;
  openDowntimeModal: () => void;
  closeDowntimeModal: () => void;
  scrapModalOpen: boolean;
  openScrapModal: () => void;
  closeScrapModal: () => void;
  // Dashboard area/asset selection (sidebar ↔ page communication)
  selectedAreaId: string | null;
  setSelectedAreaId: (id: string | null) => void;
  activeAssets: string[];
  setActiveAssets: (assets: string[]) => void;
  // Derived list for modals
  allAssets: string[];
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [tenantData, setTenantData]           = useState<any>(null);
  const [loadingManifest, setLoading]         = useState(true);
  const [clock, setClock]                     = useState('');
  const [activeDowntime, setActiveDowntime]   = useState<any>(null);
  const [downtimeModalOpen, setDtOpen]        = useState(false);
  const [scrapModalOpen, setScrapOpen]        = useState(false);
  const [selectedAreaId, setSelectedAreaId]   = useState<string | null>(null);
  const [activeAssets, setActiveAssets]       = useState<string[]>([]);

  // Live clock
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Manifest
  const fetchManifest = useCallback(async () => {
    try {
      const d = await api.tenant.get(slug);
      setTenantData(d);
    } catch {}
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => {
    fetchManifest();
    const id = setInterval(fetchManifest, 30_000);
    return () => clearInterval(id);
  }, [fetchManifest]);

  // Active downtime polling
  const refreshDowntime = useCallback(async () => {
    const d = await api.downtime.active();
    setActiveDowntime(d);
  }, []);

  useEffect(() => {
    refreshDowntime();
    const id = setInterval(refreshDowntime, 30_000);
    return () => clearInterval(id);
  }, [refreshDowntime]);

  // Derived
  const manifest     = tenantData?.manifest ?? null;
  const primaryColor = manifest?.branding?.primaryColor ?? '#6366f1';
  const tenantName   = tenantData?.name ?? slug;

  const allAssets = useMemo(() => {
    if (!manifest?.areas) return [];
    const ids = new Set<string>();
    for (const area of Object.values(manifest.areas) as any[]) {
      for (const viewName of ['operator', 'analyst']) {
        for (const w of (area[viewName]?.widgets ?? []) as any[]) {
          if (w.props?.assetId) ids.add(String(w.props.assetId));
        }
      }
    }
    return Array.from(ids).sort();
  }, [manifest]);

  return (
    <TenantContext.Provider value={{
      slug, tenantData, manifest, primaryColor, tenantName, loadingManifest, clock,
      activeDowntime, refreshDowntime,
      downtimeModalOpen,
      openDowntimeModal:  () => setDtOpen(true),
      closeDowntimeModal: () => setDtOpen(false),
      scrapModalOpen,
      openScrapModal:  () => setScrapOpen(true),
      closeScrapModal: () => setScrapOpen(false),
      selectedAreaId, setSelectedAreaId,
      activeAssets,  setActiveAssets,
      allAssets,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
