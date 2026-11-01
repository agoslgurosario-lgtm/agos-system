import { isIOSDevice } from "@/lib/device"
import { openTablePdf, PdfTable } from "@/lib/openPdf"
import { printReport } from "@/lib/printReport"

type Options = {
  /** The same title, columns and rows the page's PrintReport shows */
  table: PdfTable
  /** Desktop path. Defaults to the browser print dialog. */
  print?: () => void
  onError?: (err: unknown) => void
}

/**
 * iOS Safari ignores window.print() for our hidden print view, so on iPhone/iPad
 * we send the page's table to the server and open the PDF it makes. Everything
 * else keeps the print flow.
 *
 * Call this straight from the click handler: openTablePdf has to open its tab
 * before any await, or iOS blocks it.
 */
export function exportOrPrint({ table, print = printReport, onError }: Options) {
  if (!isIOSDevice()) {
    print()
    return
  }
  openTablePdf(table).catch((err) => onError?.(err))
}
