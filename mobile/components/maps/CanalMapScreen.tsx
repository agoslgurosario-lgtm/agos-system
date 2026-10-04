import { useMemo, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import { Feather } from '@expo/vector-icons'
import { FloodRiskLevel, RISK_STYLE } from '@/constants/rainfall'

// canal stats — matches backend's SensorNodeSerializer.get_condition() exactly
export type CanalStatus = 'Normal' | 'Warning' | 'Critical'

export interface CanalNode {
  id: string | number
  latitude: number
  longitude: number
  status: CanalStatus
  label?: string
}

interface CanalMapScreenProps {
  nodes: CanalNode[]
  centerLat: number
  centerLng: number
  zoom?: number
  riskLevel?: FloodRiskLevel | null
  onMarkerPress?: (nodeId: string | number) => void
}

// matches web's CONDITION_COLORS (colorMode='clog') exactly
const STATUS_COLORS: Record<CanalStatus, string> = {
  Normal: '#1565BC',
  Warning: '#FF9705',
  Critical: '#D81010',
}
const DEFAULT_COLOR = '#727272' // "Sleep Mode" — legend-only, never actually assigned to a live node

type MapType = 'street' | 'satellite'
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''
const SATELLITE_URL =
  `https://api.mapbox.com/styles/v1/xshvsha/cmuhvyfxq005201r59xq4b15e/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: DEFAULT_COLOR, label: 'Sleep Mode' },
  { color: STATUS_COLORS.Normal, label: 'Normal' },
  { color: STATUS_COLORS.Warning, label: 'Warning' },
  { color: STATUS_COLORS.Critical, label: 'Critical' },
]

function buildLeafletHtml(
  nodes: CanalNode[], centerLat: number, centerLng: number, zoom: number, initialType: MapType
) {
  const markersJs = nodes
    .map((n) => {
      const color = STATUS_COLORS[n.status] ?? DEFAULT_COLOR
      const label = (n.label ?? '').replace(/'/g, "\\'")
      const animation =
        n.status === 'Critical'
          ? 'agos-pulse 0.5s ease-out infinite'
          : n.status === 'Warning'
          ? 'agos-pulse 1.5s ease-out infinite'
          : 'none'

      return `
        (function() {
          var html = buildMarkerHtml('${color}', '${label}', '${animation}');
          L.marker([${n.latitude}, ${n.longitude}], {
            icon: L.divIcon({ className: '', html: html, iconSize: [0, 0], iconAnchor: [0, 0] }),
          }).addTo(map)
            .on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${JSON.stringify(n.id)} }));
            });
        })();
      `
    })
    .join('\n')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    * { box-sizing: border-box; }

    @keyframes agos-pulse {
      0%   { transform: scale(1);   opacity: 0.6; }
      70%  { transform: scale(4.5); opacity: 0;   }
      100% { transform: scale(1);   opacity: 0;   }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${centerLat}, ${centerLng}], ${zoom});

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    });
    const satelliteLayer = L.tileLayer('${SATELLITE_URL}', {
      tileSize: 256,
      maxZoom: 20,
    });

    window.setMapType = function(type) {
      if (type === 'satellite') {
        map.removeLayer(streetLayer);
        satelliteLayer.addTo(map);
      } else {
        map.removeLayer(satelliteLayer);
        streetLayer.addTo(map);
      }
    };
    window.setMapType('${initialType}');

    function buildMarkerHtml(color, label, animation) {
      var dotSize = 14;
      var half = dotSize / 2;

      var pulseRing = animation !== 'none'
        ? '<div style="position:absolute;width:' + dotSize + 'px;height:' + dotSize + 'px;border-radius:50%;background:' + color + ';opacity:0.4;top:-' + half + 'px;left:-' + half + 'px;animation:' + animation + ';pointer-events:none;"></div>'
        : '';

      var labelTag = label
        ? '<div style="position:absolute;top:-' + (half + 16) + 'px;left:' + (half + 4) + 'px;background:white;color:#122A48;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.2);border:1px solid #e0e0e0;white-space:nowrap;pointer-events:none;z-index:10;">' + label + '</div>'
        : '';

      var dot = '<div style="position:absolute;width:' + dotSize + 'px;height:' + dotSize + 'px;background:' + color + ';border:2.5px solid white;border-radius:50%;box-shadow:0 0 5px rgba(0,0,0,0.3);top:-' + half + 'px;left:-' + half + 'px;z-index:2;"></div>';

      return '<div style="position:absolute;top:0;left:0;width:0;height:0;overflow:visible;">' + pulseRing + dot + labelTag + '</div>';
    }

    ${markersJs}

    window.zoomIn = function() { map.zoomIn(); };
    window.zoomOut = function() { map.zoomOut(); };
  </script>
</body>
</html>
`
}

export default function CanalMapScreen({
  nodes,
  centerLat,
  centerLng,
  zoom = 16,
  riskLevel,
  onMarkerPress,
}: CanalMapScreenProps) {
  const webviewRef = useRef<WebView>(null)
  const [mapType, setMapType] = useState<MapType>('street')
  // read when the HTML rebuilds (e.g. node data refresh) so it doesn't snap back to street
  const mapTypeRef = useRef<MapType>(mapType)
  mapTypeRef.current = mapType

  const html = useMemo(
    () => buildLeafletHtml(nodes, centerLat, centerLng, zoom, mapTypeRef.current),
    [nodes, centerLat, centerLng, zoom]
  )

  const switchMapType = (type: MapType) => {
    setMapType(type)
    webviewRef.current?.injectJavaScript(`window.setMapType && window.setMapType('${type}'); true;`)
  }

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data?.id && onMarkerPress) onMarkerPress(data.id)
    } catch {
      // ignore malformed messages
    }
  }

  const injectZoom = (fn: 'zoomIn' | 'zoomOut') => {
    webviewRef.current?.injectJavaScript(`window.${fn} && window.${fn}(); true;`)
  }

  const risk = riskLevel ? RISK_STYLE[riskLevel] : null

  return (
    <View className="flex-1 bg-[#F4F6F8]">
      <View className="relative h-[400px] bg-[#FAFCFD] p-[15px]">
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html }}
          className="flex-1"
          onMessage={handleMessage}
          startInLoadingState
          nestedScrollEnabled
          renderLoading={() => (
            <View className="absolute inset-0 items-center justify-center bg-[#F4F6F8]">
              <ActivityIndicator size="large" color="#2F6FED" />
            </View>
          )}
        />

                {/* street / satellite toggle */}
        <View
          className="absolute left-3 top-3 m-[15px] flex-row overflow-hidden rounded-lg border border-[#C6C6C8] bg-white"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {(['street', 'satellite'] as const).map((type, i) => {
            const active = mapType === type
            return (
              <TouchableOpacity
                key={type}
                onPress={() => switchMapType(type)}
                className={`h-[30px] flex-row items-center gap-1.5 px-2.5 ${
                  active ? 'bg-[#1565BC]' : 'bg-white'
                } ${i > 0 ? 'border-l border-[#C6C6C8]' : ''}`}
              >
                <Feather
                  name={type === 'street' ? 'map' : 'globe'}
                  size={13}
                  color={active ? '#FFFFFF' : '#122A48'}
                />
                <Text
                  className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-[#122A48]'}`}
                >
                  {type === 'street' ? 'Map' : 'Sat'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* zoom in/out controls */}
        <View
          className="absolute right-3 top-3 m-[15px] overflow-hidden rounded-lg bg-white"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <TouchableOpacity
            className="h-[34px] w-[34px] items-center justify-center"
            onPress={() => injectZoom('zoomIn')}
          >
            <Feather name="plus" size={18} color="#1A1A1A" />
          </TouchableOpacity>
          <View className="h-[5px] bg-[#e6e7e9]" />
          <TouchableOpacity
            className="h-[34px] w-[34px] items-center justify-center"
            onPress={() => injectZoom('zoomOut')}
          >
            <Feather name="minus" size={18} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* legend */}
        <View
          className="absolute bottom-2.5 left-3 m-[15px] rounded-[10px] bg-[#fffffff2] px-2.5 py-1.5"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <Text className="mb-1.5 text-[11px] font-bold text-[#1A1A1A]">Live Risk Level</Text>
          {LEGEND_ITEMS.map((item) => (
            <View key={item.label} className="mb-0.5 flex-row items-center">
              <View
                className="mr-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <Text className="text-[11px] text-[#333333]">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {risk && (
        <View
          className="flex-row items-center justify-between border-b-[1.5px] px-4 py-2.5 rounded-b-xl"
          style={{ backgroundColor: risk.bg, borderBottomColor: risk.border }}
        >
          <View className="flex-row items-center gap-1.5">
            <Feather name="alert-triangle" size={14} color={risk.text} />
            <Text className="text-[13px] font-bold" style={{ color: risk.text }}>
              Overall flood risk level
            </Text>
          </View>
          <View
            className="rounded-xl px-3 py-1"
            style={{ backgroundColor: risk.border }}
          >
            <Text className="text-xs font-bold text-white">{risk.label}</Text>
          </View>
        </View>
      )}
    </View>
  )
}