import { NextRequest, NextResponse } from 'next/server'
import { put, list, del } from '@vercel/blob'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const entityId   = searchParams.get('entityId')
    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 })
    }
    const { blobs } = await list({ prefix: `${entityType}/${entityId}/` })
    const files = blobs.map(b => ({
      url:       b.url,
      name:      b.pathname.split('/').pop() ?? b.pathname,
      size:      b.size,
      uploadedAt: b.uploadedAt,
    }))
    return NextResponse.json(files)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const form       = await req.formData()
    const file       = form.get('file') as File | null
    const entityType = form.get('entityType') as string | null
    const entityId   = form.get('entityId')   as string | null

    if (!file || !entityType || !entityId) {
      return NextResponse.json({ error: 'file, entityType, entityId required' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл більше 20 МБ' }, { status: 400 })
    }

    const blob = await put(`${entityType}/${entityId}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({
      url:  blob.url,
      name: file.name,
      size: file.size,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    await del(url)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
