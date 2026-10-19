import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { weightParts, pickWeightUnit } from '../../lib/formatWeight'


export interface WasteSegment {
  label: string
  percent: number 
  color: string
}

interface WasteCompositionCardProps {
  totalKg: number
  segments: WasteSegment[]
  size?: number 
  strokeWidth?: number 
}

// Component 
export default function WasteCompositionCard({ totalKg, segments, size = 130, strokeWidth = 25, }: WasteCompositionCardProps) {
  const total = weightParts(totalKg, pickWeightUnit([totalKg]))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativePercent = 0

  return (
    <View
      className="m-[15px] mt-[1px] rounded-xl bg-white p-5"
      style={{
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text className="text-sm font-bold text-[#1A1A1A]">Waste Composition</Text>

      <View className="my-3 h-px bg-[#e6e1e1]" />

      <View className="flex-row items-center gap-3">

        {/* chart */}
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
          
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#EEF0F3"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {segments.map((seg, i) => {
              const segmentLength = (seg.percent / 100) * circumference
              const offset = circumference - (cumulativePercent / 100) * circumference
              cumulativePercent += seg.percent

              return (
                <Circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  fill="none"
                  
                  rotation={-90}
                  origin={`${center}, ${center}`}
                />
              )
            })}
          </Svg>

          {/* Center lbl*/}
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-[22px] font-extrabold text-[#1A1A1A]">{total.value}</Text>
            <Text className="mt-px text-[11px] font-semibold text-[#8A93A0]">{total.unit.toUpperCase()}</Text>
          </View>
        </View>

        {/* legend */}
        <View className="flex-1 gap-2.5">
          {segments.map((seg, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <Text className="flex-1 text-[10.5px] text-[#333333]">{seg.label}</Text>
              <Text className="text-[10.5px] font-bold text-[#1A1A1A]">{seg.percent}%</Text>
            </View>
          ))}

        </View>

      </View>

    </View>
  )
}