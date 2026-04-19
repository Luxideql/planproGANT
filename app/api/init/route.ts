import { NextResponse } from 'next/server'
import { initSheets } from '@/lib/sheets'

export async function POST() {
  try {
    await initSheets()
    return NextResponse.json({ ok: true, message: 'Аркуші ініціалізовано' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
