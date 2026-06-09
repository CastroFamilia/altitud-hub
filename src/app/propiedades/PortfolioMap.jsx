"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ═══════════════════════════════════════════════════════════════
   PortfolioMap — Leaflet map with color-coded property markers
   ═══════════════════════════════════════════════════════════════ */

import { PROPERTY_TYPES } from '@/lib/constants/property-constants';

function createMarkerIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function formatPrice(price) {
  if (!price) return '—';
  const n = Number(price);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/**
 * Safely tear down a Leaflet map instance, avoiding the _leaflet_pos
 * error that occurs when a CSS zoom transition fires after the map
 * pane DOM node has already been removed.
 */
function safeDestroyMap(map) {
  if (!map) return;
  try {
    // Cancel any in-flight pan / zoom animations first
    map.stop();

    // If a zoom animation is running, remove the transitionend listener
    // from the map pane so _onZoomTransitionEnd never fires on a detached node.
    const pane = map.getPane('mapPane');
    if (pane) {
      pane.style.transition = 'none';
      // Force a reflow to flush the cancelled transition
       
      pane.offsetHeight;
    }

    map.remove();
  } catch (_) {
    // Swallow: the pane is already gone — nothing left to clean up.
  }
}

export default function PortfolioMap({ properties = [], lang = 'es' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || properties.length === 0) return;

    // Clean up old instance
    safeDestroyMap(mapInstanceRef.current);
    mapInstanceRef.current = null;

    // Filter to only geolocated properties for bounds calc
    const geoProps = properties.filter(p => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    // Calculate bounds
    const lats = geoProps.map(p => Number(p.latitude));
    const lngs = geoProps.map(p => Number(p.longitude));
    const centerLat = lats.length ? (Math.min(...lats) + Math.max(...lats)) / 2 : 9.93;
    const centerLng = lngs.length ? (Math.min(...lngs) + Math.max(...lngs)) / 2 : -84.08;

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add markers
    const markers = [];
    for (const p of geoProps) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);

      const typeInfo = PROPERTY_TYPES[p.property_type_id] || { es: 'Prop', markerColor: '#6B7280' };
      const title = (lang === 'en' ? p.listing_title_en : p.listing_title_es) || p.name || '—';
      const price = formatPrice(p.list_price);

      const marker = L.marker([lat, lng], { icon: createMarkerIcon(typeInfo.markerColor) });

      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${typeInfo.markerColor};margin-bottom:2px">
            ${typeInfo.es}
          </div>
          <div style="font-size:13px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:4px">
            ${title.substring(0, 60)}${title.length > 60 ? '…' : ''}
          </div>
          <div style="font-size:15px;font-weight:900;color:#0f172a;margin-bottom:4px">
            ${price}
          </div>
          ${p.unparsed_address ? `<div style="font-size:10px;color:#94a3b8">📍 ${p.unparsed_address.substring(0, 50)}</div>` : ''}
        </div>
      `, { closeButton: false, maxWidth: 250 });

      marker.addTo(map);
      markers.push(marker);
    }

    // Fit bounds
    if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    // Legend
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.style.cssText = 'background:white;padding:8px 12px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:system-ui;';
      const types = [...new Set(properties.map(p => p.property_type_id).filter(Boolean))];
      div.innerHTML = types.map(tid => {
        const t = PROPERTY_TYPES[tid] || { es: `T${tid}`, markerColor: '#999' };
        const count = properties.filter(p => p.property_type_id === tid).length;
        return `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
          <span style="width:10px;height:10px;border-radius:50%;background:${t.markerColor};display:inline-block;border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span>
          <span style="font-size:10px;font-weight:700;color:#64748b">${t.es} (${count})</span>
        </div>`;
      }).join('');
      return div;
    };
    legend.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      safeDestroyMap(mapInstanceRef.current);
      mapInstanceRef.current = null;
    };
  }, [properties, lang]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
