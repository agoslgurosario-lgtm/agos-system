"use client"

// icons
import { Plus, Minus, Map as MapIcon, Satellite } from "lucide-react"

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, GeoJSON } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useRef, useState } from "react"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const CONDITION_COLORS: Record<string, string> = {
  Critical: "#D81010",
  Warning:  "#FF9705",
  Normal:   "#1565BC",
  Maintenance: "#7C3AED", 
  default:  "#727272",
}

const HEALTH_COLORS: Record<string, string> = {
  Critical:    "#D81010",
  Warning:     "#D86610",
  Normal:      "#2C7B3C",
  Maintenance: "#7C3AED",
  default:     "#727272",
}

const AVAILABILITY_COLORS: Record<string, string> = {
  Occupied:  "#2C7B3C",
  Available: "#727272",
  default:   "#727272",
}


function HotspotAvailabilityLegend() {
  const map = useMap()

  useEffect(() => {
    const legend = new (L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd() {
        const div = L.DomUtil.create('div')
        div.innerHTML = `
          <div style="
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            font-size: 11px;
            color: #122A48;
          ">
            <p style="font-weight:700; margin-bottom:6px;">Hotspot Status</p>
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="
                display:inline-block;
                width:12px; height:12px;
                border-radius:50%;
                background:#727272;
                border: 2px solid white;
                box-shadow: 0 0 3px rgba(0,0,0,0.2);
              "></span>
              <span>Available</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="
                display:inline-block;
                width:12px; height:12px;
                border-radius:50%;
                background:#2C7B3C;
                border: 2px solid white;
                box-shadow: 0 0 3px rgba(0,0,0,0.2);
              "></span>
              <span>Occupied</span>
            </div>
          </div>
        `
        return div
      }
    }))()

    legend.addTo(map)
    return () => { legend.remove() }
  }, [map])

  return null
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function ZoomControl() {
  const map = useMap()
  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: '10px', marginLeft: '10px' }}>
      <div className="leaflet-control flex flex-col rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.15)] border border-[#C6C6C8]">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          title="Zoom in"
          className="bg-white hover:bg-gray-100 cursor-pointer w-[30px] h-[30px] flex items-center justify-center text-[#122A48] border-b border-[#C6C6C8]"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          title="Zoom out"
          className="bg-white hover:bg-gray-100 cursor-pointer w-[30px] h-[30px] flex items-center justify-center text-[#122A48]"
        >
          <Minus size={16} />
        </button>
      </div>
    </div>
  )
}

function MapLegend() {
  const map = useMap()

  useEffect(() => {
    const legend = new (L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd() {
        const div = L.DomUtil.create('div')
        div.innerHTML = `
          <div style="
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            font-size: 11px;
            color: #122A48;
          ">
            <p style="font-weight:700; margin-bottom:6px;">Live Risk Level</p>
            ${[
              { color: '#727272', label: 'Sleep Mode' },
              { color: '#1565BC', label: 'Normal' },
              { color: '#FF9705', label: 'Warning' },
              { color: '#D81010', label: 'Critical' },
              { color: '#7C3AED', label: 'Under Maintenance' },
            ].map(({ color, label }) => `
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="
                  display:inline-block;
                  width:12px; height:12px;
                  border-radius:50%;
                  background:${color};
                  border: 2px solid white;
                  box-shadow: 0 0 3px rgba(0,0,0,0.2);
                "></span>
                <span>${label}</span>
              </div>
            `).join('')}
          </div>
        `
        return div
      }
    }))()

    legend.addTo(map)
    return () => { legend.remove() }
  }, [map])

  return null
}

function HealthLegend() {
  const map = useMap()

  useEffect(() => {
    const legend = new (L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd() {
        const div = L.DomUtil.create('div')
        div.innerHTML = `
          <div style="
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            font-size: 11px;
            color: #122A48;
          ">
            <p style="font-weight:700; margin-bottom:6px;">Node Health Status</p>
            ${[
              { color: '#727272', label: 'Offline / Sleep' },
              { color: '#2C7B3C', label: 'Operating Normally' },
              { color: '#D86610', label: 'Needs Attention' },
              { color: '#D81010', label: 'Critical Fault' },
              { color: '#7C3AED', label: 'Under Maintenance' },
            ].map(({ color, label }) => `
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="
                  display:inline-block;
                  width:12px; height:12px;
                  border-radius:50%;
                  background:${color};
                  border: 2px solid white;
                  box-shadow: 0 0 3px rgba(0,0,0,0.2);
                "></span>
                <span>${label}</span>
              </div>
            `).join('')}
          </div>
        `
        return div
      }
    }))()

    legend.addTo(map)
    return () => { legend.remove() }
  }, [map])

  return null
}

function createColoredIcon(color: string, label?: string, condition?: string) {
  const animation =
    condition === 'Critical'
      ? 'agos-pulse 0.5s ease-out infinite'
      : condition === 'Warning'
      ? 'agos-pulse 1.5s ease-out infinite'
      : 'none'

  const dotSize = 14
  const half = dotSize / 2

  const pulseRing = animation !== 'none' ? `
    <div style="
      position: absolute;
      width: ${dotSize}px;
      height: ${dotSize}px;
      border-radius: 50%;
      background: ${color};
      opacity: 0.4;
      top: -${half}px;
      left: -${half}px;
      animation: ${animation};
      pointer-events: none;
    "></div>` : ''

  const labelTag = label ? `
    <div style="
      position: absolute;
      top: -${half + 16}px;
      left: ${half + 4}px;
      background: white;
      color: #122A48;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      border: 1px solid #e0e0e0;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
      animation: none !important;
    ">${label}</div>` : ''

  const dot = `
    <div style="
      position: absolute;
      width: ${dotSize}px;
      height: ${dotSize}px;
      background: ${color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
      top: -${half}px;
      left: -${half}px;
      z-index: 2;
      animation: none !important;
    "></div>`

  return L.divIcon({
    className: '',
    html: `
      <style>
        @keyframes agos-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(4.5); opacity: 0;   }
          100% { transform: scale(1);   opacity: 0;   }
        }
      </style>
      <div style="position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: visible;">
        ${pulseRing}
        ${dot}
        ${labelTag}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -(half + 2)],
  })
}

const ROSARIO_BOUNDS: L.LatLngBoundsExpression = [
  [16.15, 120.40],
  [16.60, 120.55],
]

const ROSARIO_CENTER: [number, number] = [16.23031273833657, 120.48632076236241]

function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom)
  }, [lat, lng, zoom])
  return null
}

export type MapMarker = {
  latitude: number
  longitude: number
  label?: string
  condition?: string 
  sublabel?: string
  onMarkerClick?: () => void
  usePin?: boolean
}

type Props = {
  latitude?: number
  longitude?: number
  label?: string
  zoom?: number
  markers?: MapMarker[]
  onMapClick?: (lat: number, lng: number) => void
  colorMode?: 'clog' | 'health' | 'availability'
  showLegend?: boolean
  boundaryGeoJson?: any
  showMarkerPopups?: boolean
}

export default function AgosMap({ latitude, longitude, label, zoom = 14, markers, onMapClick, colorMode = 'clog', showLegend = true, boundaryGeoJson, showMarkerPopups = true }: Props) {
  const colorMap = colorMode === 'health'
    ? HEALTH_COLORS
    : colorMode === 'availability'
    ? AVAILABILITY_COLORS
    : CONDITION_COLORS
  const hasMultiple = markers && markers.length > 0
  const hasSingle   = !!latitude && !!longitude
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street')

  const center: [number, number] = hasSingle
    ? [latitude, longitude]
    : hasMultiple
      ? [
          markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length,
          markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length,
        ]
      : ROSARIO_CENTER

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      maxBounds={ROSARIO_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={13}
      maxZoom={20}
      style={{ height: "100%", width: "100%" }}
      className="rounded-lg z-0"
      zoomControl={false}
    >
      {mapType === 'satellite' ? (
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://api.mapbox.com/styles/v1/xshvsha/cmuhvyfxq005201r59xq4b15e/tiles/256/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
          tileSize={256}
          maxZoom={20}
        />
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={20}
        />
      )}

      <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
        <div className="leaflet-control flex rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.15)] border border-[#C6C6C8]">
          <button
            type="button"
            onClick={() => setMapType('street')}
            title="Street view"
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 h-[30px] text-[11px] font-semibold transition-colors ${
              mapType === 'street' ? "bg-[#1565BC] text-white" : "bg-white text-[#122A48] hover:bg-gray-100"
            }`}
          >
            <MapIcon size={13} />
            Map
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            title="Satellite view"
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 h-[30px] text-[11px] font-semibold transition-colors border-l border-[#C6C6C8] ${
              mapType === 'satellite' ? "bg-[#1565BC] text-white" : "bg-white text-[#122A48] hover:bg-gray-100"
            }`}
          >
            <Satellite size={13} />
            Sat
          </button>
        </div>
      </div>
      <MapClickHandler onMapClick={onMapClick} />
      <ZoomControl />

      {boundaryGeoJson && (
      <GeoJSON
        key={JSON.stringify(boundaryGeoJson.properties?.adm4_en ?? boundaryGeoJson.id)}
        data={boundaryGeoJson}
        style={{
          color: "#1565BC",
          weight: 2,
          fillColor: "#1565BC",
          fillOpacity: 0.1,
        }}
      />
      )}

      {showLegend && (
        colorMode === 'availability' ? <HotspotAvailabilityLegend /> :
        colorMode === 'health'       ? <HealthLegend /> :
        <MapLegend />
      )}

      {hasSingle && (
        <RecenterMap lat={latitude} lng={longitude} zoom={zoom} />
      )}

      {!hasMultiple && hasSingle && (
        <Marker position={[latitude, longitude]}>
          <Popup>{label ?? "Location"}</Popup>
        </Marker>
      )}

      {hasMultiple && markers.map((m, i) => {
        const color = colorMap[m.condition ?? "default"] ?? colorMap.default
        const icon = createColoredIcon(color, m.label, m.condition)
        return (
          <Marker
              key={i}
              position={[m.latitude, m.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => m.onMarkerClick?.()
              }}
            >
            {showMarkerPopups && (
              <Popup>
                <div className="text-xs font-semibold">{m.label ?? "Node"}</div>
                {m.sublabel && <div className="text-xs text-gray-500 mt-0.5">{m.sublabel}</div>}
              </Popup>
            )}
          </Marker>
        )
      })}
    </MapContainer>
  )
}