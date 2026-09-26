"use client"

import { MapMarker } from "./AgosMap"
import dynamic from "next/dynamic"
import { SpinnerIcon } from "@/components/SpinnerIcon"

const AgosMapDynamic = dynamic(() => import("./AgosMap"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-full w-full">
      <SpinnerIcon size={24} color="#122A48" />
    </div>
  ),
})

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


export default function AgosMapWrapper(props: Props) {
  return <AgosMapDynamic {...props} />
}