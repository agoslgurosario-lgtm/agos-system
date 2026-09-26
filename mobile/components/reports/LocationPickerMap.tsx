import { useMemo, useState } from 'react'
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export interface PickedLocation {
  latitude: number
  longitude: number
}

interface LocationPickerMapProps {
  visible: boolean
  onClose: () => void
  onConfirm: (location: PickedLocation) => void
  /** existing pin, if the user is editing a report that already has coordinates */
  initial?: PickedLocation | null
  /** where to center when there's no pin yet — pass the barangay's coordinates */
  centerLat: number
  centerLng: number
  zoom?: number
}

function buildPickerHtml(
  centerLat: number,
  centerLng: number,
  zoom: number,
  initial: PickedLocation | null
) {
  const initialMarkerJs = initial
    ? `placeMarker(${initial.latitude}, ${initial.longitude}, false);`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var marker = null;

    function markerHtml() {
      return '<div style="position:absolute;top:0;left:0;width:0;height:0;overflow:visible;">'
        + '<div style="position:absolute;width:18px;height:18px;background:#1d4ed8;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.35);top:-9px;left:-9px;"></div>'
        + '</div>';
    }

    function placeMarker(lat, lng, notify) {
      if (marker) { map.removeLayer(marker); }
      marker = L.marker([lat, lng], {
        icon: L.divIcon({ className: '', html: markerHtml(), iconSize: [0, 0], iconAnchor: [0, 0] }),
      }).addTo(map);

      if (notify) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
      }
    }

    map.on('click', function(e) {
      placeMarker(e.latlng.lat, e.latlng.lng, true);
    });

    ${initialMarkerJs}

    window.zoomIn = function() { map.zoomIn(); };
    window.zoomOut = function() { map.zoomOut(); };
  </script>
</body>
</html>
`
}

export default function LocationPickerMap({
  visible,
  onClose,
  onConfirm,
  initial = null,
  centerLat,
  centerLng,
  zoom = 16,
}: LocationPickerMapProps) {
  const [picked, setPicked] = useState<PickedLocation | null>(initial)

  // rebuilt whenever the modal reopens so the existing pin shows up
  const html = useMemo(
    () => buildPickerHtml(
      initial?.latitude ?? centerLat,
      initial?.longitude ?? centerLng,
      zoom,
      initial
    ),
    [visible, initial, centerLat, centerLng, zoom]
  )

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setPicked({ latitude: data.lat, longitude: data.lng })
      }
    } catch {
      // ignore malformed messages
    }
  }

  const handleOpen = () => setPicked(initial)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={handleOpen}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between border-b border-[#f1f5f9] px-4 py-3">
          <TouchableOpacity onPress={onClose} className="p-1">
            <MaterialCommunityIcons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-[#122A48]">Pick Location</Text>
          <View className="w-7" />
        </View>

        <View className="flex-1">
          <WebView
            source={{ html }}
            originWhitelist={['*']}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-white">
                <ActivityIndicator color="#1d4ed8" />
              </View>
            )}
          />
        </View>

        <View className="border-t border-[#f1f5f9] px-4 py-3">
          <Text className="mb-2 text-[11px] text-[#64748b]">
            {picked
              ? `Selected: ${picked.latitude.toFixed(6)}, ${picked.longitude.toFixed(6)}`
              : 'Tap anywhere on the map to drop a pin.'}
          </Text>

          <TouchableOpacity
            disabled={!picked}
            onPress={() => picked && onConfirm(picked)}
            className={`flex-row items-center justify-center gap-2 rounded-xl py-3 ${
              picked ? 'bg-[#16a34a]' : 'bg-[#cbd5e1]'
            }`}
          >
            <MaterialCommunityIcons name="check" size={18} color="white" />
            <Text className="text-sm font-bold text-white">Use this location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}