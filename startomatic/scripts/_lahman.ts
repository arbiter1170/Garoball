import fs from 'node:fs'
import { parse } from 'csv-parse/sync'

export type LahmanRow = Record<string, string>

export function readCsvRows(filePath: string): LahmanRow[] {
  const csv = fs.readFileSync(filePath, 'utf8')
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
    trim: true,
  }) as LahmanRow[]
}

export function n(value: string | undefined): number {
  if (!value) return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function nOrNull(value: string | undefined): number | null {
  if (!value) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function s(value: string | undefined): string | null {
  const v = (value ?? '').trim()
  return v.length ? v : null
}

export function formatYmd(date: string | null): string | null {
  if (!date) return null
  // Lahman People.csv uses YYYY-MM-DD, but we keep it tolerant.
  const v = date.trim()
  return v.length ? v : null
}
