import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import type { CanalStatus } from '@/components/maps/CanalMapScreen'

export interface NodeDetail {
  id: string | number
  title: string
  status: CanalStatus
  statusLabel: string
  waterLevelPercent: number | null
  sensorReadingCm: number | null
  lastUpdated: string
  flowRate: number | null
  clogPercentage: number | null
}

interface NodeDetailSheetProps {
  node: NodeDetail | null
  visible: boolean
  onClose: () => void
  onRespond?: (nodeId: string | number) => void
  onMarkCleared?: (nodeId: string | number) => void
  onCreateReport?: (nodeId: string | number) => void
}

const STATUS_COLORS: Record<CanalStatus, string> = {
  Normal: '#1565BC',
  Warning: '#FF9705',
  Critical: '#D81010',
}

export default function NodeDetailSheet({
  node,
  visible,
  onClose,
  onRespond,
  onMarkCleared,
  onCreateReport,
}: NodeDetailSheetProps) {

  const sheetHeight = Dimensions.get('window').height

  const translateY = useRef(new Animated.Value(sheetHeight)).current

  useEffect(() => {
    if (visible && node) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start()
    }
  }, [visible, node?.id])

  const closeAnimated = () => {
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose())
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 2,
      onMoveShouldSetPanResponderCapture: (_evt, gesture) => Math.abs(gesture.dy) > 2,

      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy)
      },

      onPanResponderRelease: (_evt, gesture) => {
        const shouldDismiss = gesture.dy > 120 || gesture.vy > 0.8
        if (shouldDismiss) {
          Animated.timing(translateY, {
            toValue: sheetHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose())
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start()
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
      },
    })
  ).current

  if (!node || !visible) return null

  const statusColor = STATUS_COLORS[node.status]

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={closeAnimated} />

      <Animated.View style={[styles.sheet, { bottom: 0, transform: [{ translateY }] }]}>
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={closeAnimated} hitSlop={10}>
          <Feather name="x" size={20} color="rgb(168, 161, 161)" />
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.title}>{node.title}</Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{node.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* water level */}
        <View style={styles.sectionHeader}>
          <Feather name="droplet" size={13} color="#2F6FED" />
          <Text style={styles.sectionTitle}>WATER LEVEL DATA</Text>
        </View>
        <Row
          label="Current level"
          value={node.waterLevelPercent != null ? `${Math.round(node.waterLevelPercent)}% capacity` : '— % capacity'}
          valueColor={statusColor}
        />
        <Row
          label="Sensor reading"
          value={node.sensorReadingCm != null ? `${node.sensorReadingCm} cm from sensor` : '— cm from sensor'}
        />
        <Row label="Last updated" value={node.lastUpdated} muted />

        <View style={styles.divider} />

        {/* water flow */}
        <View style={styles.sectionHeader}>
          <Feather name="activity" size={13} color="#2F6FED" />
          <Text style={styles.sectionTitle}>WATER FLOW DATA</Text>
        </View>
        <Row
          label="Flow rate"
          value={node.flowRate != null ? `${node.flowRate.toFixed(5)} m/s` : '— m/s'}
        />

        <View style={styles.divider} />

        {/* clog detection */}
        <View style={styles.sectionHeader}>
          <Feather name="slash" size={13} color="#2F6FED" />
          <Text style={styles.sectionTitle}>CLOG DETECTION</Text>
        </View>
        <Row
          label="Clog percentage"
          value={node.clogPercentage != null ? `${node.clogPercentage}%` : '— %'}
        />

        <View style={styles.divider} />

        {/* report */}
        <View style={styles.sectionHeader}>
          <Feather name="file-text" size={13} color="#2F6FED" />
          <Text style={styles.sectionTitle}>REPORT</Text>
        </View>
        <TouchableOpacity
          style={styles.reportButton}
          activeOpacity={0.85}
          onPress={() => onCreateReport?.(node.id)}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.reportButtonText}>Create Report</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  )
}

function Row({
  label,
  value,
  valueColor,
  muted,
}: {
  label: string
  value: string
  valueColor?: string
  muted?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          valueColor ? { color: valueColor, fontWeight: '700' } : null,
          muted ? { color: '#8A93A0' } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.36)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#F9FAFA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 35,
    paddingTop: 25,
    paddingBottom: 60,
  },
  handleArea: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  handle: {
    alignSelf: 'center',
    width: 70,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#D8DCE2',
    marginTop: 0,
    marginBottom: 30,
  },
  closeButton: { position: 'absolute', right: 16, top: 25 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  statusDot: { width: 9, height: 9, borderRadius: 4.5 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  statusPill: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#e6e1e1', marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#2F6FED', letterSpacing: 0.4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel: { fontSize: 13, color: '#5B6472' },
  rowValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
    reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 2,
  },
  reportButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})