"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Update this import to match where AgosMapWrapper.tsx is stored in your project.
const AgosMapWrapper = dynamic(
  () => import("@/components/Map/AgosMapWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        Loading canal map...
      </div>
    ),
  },
);

const stats = [
  {
    label: "Monitoring Points",
    value: "1",
    note: "Sensor nodes in this barangay",
    icon: "⌖",
    iconClass: "bg-blue-50 text-blue-700",
  },
  {
    label: "Critical Nodes",
    value: "0",
    note: "No critical nodes detected",
    icon: "!",
    iconClass: "bg-red-50 text-red-600",
  },
  {
    label: "Obstructed Canals",
    value: "1",
    note: "Awaiting response",
    icon: "◉",
    iconClass: "bg-amber-50 text-amber-700",
  },
  {
    label: "Average Water Level",
    value: "5.9 cm",
    note: "Across monitored nodes",
    icon: "≈",
    iconClass: "bg-cyan-50 text-cyan-700",
  },
];

const alerts = [
  {
    title: "Obstructed canal reported",
    detail: "SN-1 · Poblacion West",
    status: "Awaiting response",
    tone: "amber",
    icon: "!",
  },
  {
    title: "Water level monitoring",
    detail: "Current average: 5.9 cm",
    status: "No critical threshold triggered",
    tone: "blue",
    icon: "↗",
  },
  {
    title: "Sensor node online",
    detail: "SN-1 is reporting status",
    status: "Last status: sample data",
    tone: "green",
    icon: "●",
  },
];

const waste = [
  { label: "Biodegradable", value: "14.1%", color: "#52BD6B" },
  { label: "Recyclable", value: "21.8%", color: "#5B9DF5" },
  { label: "Residual", value: "12.6%", color: "#D7A064" },
  { label: "Special Waste", value: "4.7%", color: "#EB6268" },
];

export default function LocalizedCanalMapPage() {
  const [layer, setLayer] = useState<"clog" | "health" | "availability">(
    "clog",
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Statistic cards */}
        <section
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
          aria-label="Monitoring statistics"
        >
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="flex min-h-[128px] gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl font-bold ${stat.iconClass}`}
              >
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {stat.note}
                </p>
              </div>
            </article>
          ))}
        </section>

        {/* Main content */}
        <section className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
          {/* Map panel */}
          <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-slate-900">Canal Network Map</h3>
                <p className="mt-1 text-xs text-slate-500">
                  GPS-tagged sensor nodes and current canal risk levels
                </p>
              </div>

              {/* Uses the existing map's colorMode prop. Change modes if desired. */}
              {/* <div className="flex w-fit rounded-xl bg-slate-100 p-1">
                {(
                  [
                    ["clog", "Clog Risk"],
                    ["health", "Node Health"],
                    ["availability", "Availability"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLayer(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      layer === value
                        ? "bg-[#1565BC] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div> */}
            </div>

            <div className="h-[420px] min-h-[340px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[520px]">
              <AgosMapWrapper
                latitude={16.229}
                longitude={120.486}
                label="SN-1 – Poblacion West"
                zoom={15}
                colorMode={layer}
                showLegend={true}
                showMarkerPopups={true}
              />
            </div>

            <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Overall flood risk level
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Confirm this status against your live sensor readings.
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                Unknown
              </span>
            </div>
          </article>

          {/* Right side panels */}
          <div className="grid min-w-0 gap-5 lg:grid-cols-2 2xl:grid-cols-1">
            {/* Alerts */}
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h3 className="font-bold">Live Alerts</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Latest conditions requiring attention
                </p>
              </div>

              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.title}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${
                        alert.tone === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : alert.tone === "blue"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {alert.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{alert.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {alert.detail}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {alert.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Waste composition */}
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h3 className="font-bold">Waste Composition</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Recorded waste by category
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:items-center">
                <div
                  role="img"
                  aria-label="Illustrative waste composition doughnut chart"
                  className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full"
                  style={{
                    background:
                      "conic-gradient(#52BD6B 0 14.1%, #5B9DF5 14.1% 35.9%, #D7A064 35.9% 48.5%, #EB6268 48.5% 53.2%, #EDF0F4 53.2% 100%)",
                  }}
                >
                  <div className="grid h-[102px] w-[102px] place-items-center rounded-full bg-white text-center">
                    <div>
                      <p className="text-2xl font-extrabold">30.0</p>
                      <p className="text-[10px] font-bold tracking-widest text-slate-500">
                        GRAMS
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  {waste.map((item) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-xs"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-bold text-slate-800">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* <p className="mt-5 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                Sample values for layout demonstration. Connect your actual
                waste records before deployment.
              </p> */}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
