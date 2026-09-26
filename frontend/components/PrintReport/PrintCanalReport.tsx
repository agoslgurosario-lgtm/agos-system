"use client"

import { createPortal } from "react-dom"
import type { CanalMonitoringReport } from "@/types/report"

type PrintCanalReportProps = {
  report: CanalMonitoringReport
  generatedBy: string
}

const SEVERITY_OPTIONS: [string, string][] = [['Critical', 'Critical'], ['Medium', 'Medium'], ['Low', 'Low']]
const WATER_LEVEL_OPTIONS: [string, string][] = [['Low', 'Low'], ['Moderate', 'Moderate'], ['High', 'High']]
const COVERAGE_OPTIONS: [string, string][] = [['Under_25', '<25%'], ['25_50', '25–50%'], ['50_75', '50–75%'], ['Over_75', '>75%']]
const FLOW_OPTIONS: [string, string][] = [['Normal', 'Normal'], ['Reduced', 'Reduced'], ['Blocked', 'Blocked']]
const FINAL_CONDITION_OPTIONS: [string, string][] = [['Clear', 'Clear'], ['Partially_Clear', 'Partially Clear'], ['Still_Obstructed', 'Still Obstructed']]
const PHOTO_LABELS: [string, string][] = [['Before_Clearing', 'Before Cleanup'], ['After_Clearing', 'After Cleanup'], ['Additional_Evidence', 'Additional Evidence']]
const SIGNATORY_POSITIONS = ['Barangay Secretary', 'Chairman Environment', 'Brgy. Sanitary Inspector', 'Punong Barangay']

function ChoiceRow({ options, selected }: { options: [string, string][]; selected: string | null }) {
  return (
    <div className="print-canal-opts">
      {options.map(([value, label]) => (
        <span key={value}>[{value === selected ? 'X' : '\u00A0\u00A0\u00A0'}]&nbsp;{label}&nbsp;&nbsp;&nbsp;</span>
      ))}
    </div>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function kg(v: number | null) {
  return v != null ? Number(v).toFixed(2) : '0.00'
}

export function PrintCanalReport({ report, generatedBy }: PrintCanalReportProps) {
  if (typeof document === "undefined") return null

  const photoGroups = PHOTO_LABELS
    .map(([category, label]) => ({ label, photos: report.media.filter(m => m.media_category === category && m.file_url) }))
    .filter(g => g.photos.length > 0)

  const content = (
    <div className="print-report">
      <div className="print-header">
        <img src="/ROS-logo.jpg" className="print-logo" alt="" />
        <div className="print-header-text">
          <p>Republic of the Philippines</p>
          <p>Province of La Union</p>
          <p className="print-municipality">Municipality Of Rosario</p>
          <p>Barangay {report.barangay_details?.barangay_name ?? '—'}</p>
        </div>
      </div>
      <div className="print-divider" />

      <div className="print-canal-title">
        <p className="print-canal-office">Municipal Environmental and Natural Resources Office</p>
        <p className="print-canal-subtitle">Canal Monitoring Report</p>
        <p className="print-canal-meta">
          Report No. {report.report_id}
          {report.reported_by_details && (
            <> &nbsp;|&nbsp; Filed by <strong>{report.reported_by_details.first_name} {report.reported_by_details.last_name}</strong></>
          )}
          &nbsp;|&nbsp; Exported by <strong>{generatedBy}</strong>, {new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <p className="print-canal-section-bar">Monitoring Site Information</p>
      <table className="print-canal-fields"><tbody>
        <tr>
          <td><div className="print-canal-lbl">Canal Name / ID</div><div className="print-canal-val">{report.canal_name || '—'}</div></td>
          <td><div className="print-canal-lbl">Barangay</div><div className="print-canal-val">{report.barangay_details?.barangay_name ?? '—'}</div></td>
        </tr>
        <tr>
          <td><div className="print-canal-lbl">City / Municipality</div><div className="print-canal-val">Rosario</div></td>
          <td><div className="print-canal-lbl">Province</div><div className="print-canal-val">La Union</div></td>
        </tr>
        <tr>
          <td><div className="print-canal-lbl">GPS Coordinates (Lat, Long)</div><div className="print-canal-val">{report.latitude != null && report.longitude != null ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}` : '—'}</div></td>
          <td><div className="print-canal-lbl">Nearest Landmark</div><div className="print-canal-val">{report.nearest_landmark || '—'}</div></td>
        </tr>
      </tbody></table>

      <p className="print-canal-section-bar">Detection Summary</p>
      <table className="print-canal-fields"><tbody>
        <tr>
          <td><div className="print-canal-lbl">Date / Time Observed</div><div className="print-canal-val">{fmtDate(report.date_observed)}</div></td>
          <td><div className="print-canal-lbl">Severity (choose one)</div><ChoiceRow options={SEVERITY_OPTIONS} selected={report.severity} /></td>
        </tr>
      </tbody></table>

      <p className="print-canal-section-bar">Canal Condition</p>
      <table className="print-canal-fields"><tbody>
        <tr>
          <td><div className="print-canal-lbl">Water Level (choose one)</div><ChoiceRow options={WATER_LEVEL_OPTIONS} selected={report.water_level} /></td>
          <td><div className="print-canal-lbl">Water Flow Condition (choose one)</div><ChoiceRow options={FLOW_OPTIONS} selected={report.water_flow_condition} /></td>
        </tr>
        <tr>
          <td colSpan={2}><div className="print-canal-lbl">Obstruction Coverage (choose one)</div><ChoiceRow options={COVERAGE_OPTIONS} selected={report.obstruction_coverage} /></td>
        </tr>
      </tbody></table>

      <p className="print-canal-section-bar">Waste Composition (kg)</p>
      <table className="print-canal-items"><tbody>
        <tr><td className="print-canal-item-lbl">Plastic</td><td className="print-canal-item-val">{kg(report.waste_plastic_kg)}</td><td className="print-canal-item-gap" /><td className="print-canal-item-lbl">Food Wrapper</td><td className="print-canal-item-val">{kg(report.waste_food_wrapper_kg)}</td></tr>
        <tr><td className="print-canal-item-lbl">Paper / Cardboard</td><td className="print-canal-item-val">{kg(report.waste_paper_cardboard_kg)}</td><td className="print-canal-item-gap" /><td className="print-canal-item-lbl">Glass</td><td className="print-canal-item-val">{kg(report.waste_glass_kg)}</td></tr>
        <tr><td className="print-canal-item-lbl">Organic</td><td className="print-canal-item-val">{kg(report.waste_organic_kg)}</td><td className="print-canal-item-gap" /><td className="print-canal-item-lbl">Metal</td><td className="print-canal-item-val">{kg(report.waste_metal_kg)}</td></tr>
        <tr><td className="print-canal-item-lbl">Foam</td><td className="print-canal-item-val">{kg(report.waste_foam_kg)}</td><td className="print-canal-item-gap" /><td className="print-canal-item-lbl">Clothes / Textiles</td><td className="print-canal-item-val">{kg(report.waste_textile_kg)}</td></tr>
        <tr><td className="print-canal-item-lbl">E-waste</td><td className="print-canal-item-val">{kg(report.waste_ewaste_kg)}</td><td className="print-canal-item-gap" /><td className="print-canal-item-lbl">Other{report.waste_other_label ? ` (${report.waste_other_label})` : ''}</td><td className="print-canal-item-val">{kg(report.waste_other_kg)}</td></tr>
      </tbody></table>

      <p className="print-canal-section-bar">Barangay Response</p>
      <table className="print-canal-fields"><tbody>
        <tr>
          <td><div className="print-canal-lbl">Assigned Personnel</div><div className="print-canal-val">{report.assigned_personnel || '—'}</div></td>
          <td><div className="print-canal-lbl">Date / Time Responded</div><div className="print-canal-val">{fmtDate(report.date_responded)}</div></td>
        </tr>
        <tr>
          <td><div className="print-canal-lbl">Waste Collected</div><div className="print-canal-val">{report.waste_collected_amount != null ? `${Number(report.waste_collected_amount).toFixed(2)} kg` : '—'}</div></td>
          <td><div className="print-canal-lbl">Final Canal Condition (choose one)</div><ChoiceRow options={FINAL_CONDITION_OPTIONS} selected={report.final_canal_condition} /></td>
        </tr>
      </tbody></table>

      <p className="print-canal-textbox-label">Action Taken</p>
      <div className="print-canal-textbox">{report.action_taken || '—'}</div>

      <p className="print-canal-textbox-label">Remarks</p>
      <div className="print-canal-textbox">{report.remarks || '—'}</div>

      {photoGroups.length > 0 && (
        <>
          <p className="print-canal-section-bar">Photo Documentation</p>
          {photoGroups.map(group => (
            <div key={group.label}>
              <p className="print-canal-group-title">{group.label}</p>
              <div className="print-canal-photos">
                {group.photos.map(p => <img key={p.media} src={p.file_url!} className="print-canal-photo" alt="" />)}
              </div>
            </div>
          ))}
        </>
      )}

      <div className="print-canal-sig-grid">
        {SIGNATORY_POSITIONS.map(pos => (
          <div key={pos} className="print-canal-sig-cell">
            <div className="print-canal-sig-space" />
            <div className="print-canal-sig-name print-canal-sig-name-placeholder">Name of Signatory</div>
            <div className="print-canal-sig-pos">{pos}</div>
          </div>
        ))}
      </div>

      <div className="print-footer">AGOS — Automated Geo-Based Obstruction Sensing System</div>
    </div>
  )

  return createPortal(content, document.body)
}