import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-token',
}

const STORAGE_BUCKET = 'exports'
const STORAGE_PATH = 'client-profiles-master.xlsx'
const CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const SIGNED_URL_TTL_SECONDS = 60 * 30

type SubmissionRow = {
  id: number
  created_at: string
  submitted_at: string
  company_name: string | null
  contact_name: string | null
  client_email: string | null
  selected_services: string[] | null
  payload: Record<string, unknown> | null
}

const FIELD_MAP: Array<{ header: string; key: string }> = [
  { header: 'Submitted At', key: 'submittedAt' },
  { header: 'Date Created', key: 'dateCreated' },
  { header: 'Sales Rep', key: 'salesRep' },
  { header: 'Marketing Rep', key: 'marketingRep' },
  { header: 'Graphics/IT Rep', key: 'graphicsItRep' },
  { header: 'Company Name', key: 'companyName' },
  { header: 'Industry', key: 'industry' },
  { header: 'Organization Type', key: 'organizationType' },
  { header: 'Contact Name', key: 'contactName' },
  { header: 'Marketing Contact', key: 'marketingContact' },
  { header: 'Marketing Phone', key: 'marketingPhone' },
  { header: 'Purchasing Contact', key: 'purchasingContact' },
  { header: 'Purchasing Phone', key: 'purchasingPhone' },
  { header: 'Address', key: 'address' },
  { header: 'City', key: 'city' },
  { header: 'State', key: 'state' },
  { header: 'Zip', key: 'zip' },
  { header: 'Office Phone', key: 'officePhone' },
  { header: 'Fax', key: 'fax' },
  { header: 'Mobile', key: 'mobile' },
  { header: 'Website', key: 'website' },
  { header: 'Email', key: 'email' },
  { header: 'Consultation Date', key: 'consultationDate' },
  { header: 'Basic Needs / Goals', key: 'basicNeedsGoals' },
  { header: 'Needed By (First)', key: 'neededByFirst' },
  { header: 'Note (First)', key: 'noteFirst' },
  { header: 'Primary Need', key: 'primaryNeed' },
  { header: 'Needed By (Second)', key: 'neededBySecond' },
  { header: 'Note (Second)', key: 'noteSecond' },
  { header: 'Selected Services', key: 'selectedServices' },
]

const toText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ')
  }

  return String(value)
}

const sheetSafeName = (input: string): string => {
  const sanitized = input.replace(/[\\/*?:\[\]]/g, ' ').trim()
  const compact = sanitized.replace(/\s+/g, ' ')
  return (compact || 'Client').slice(0, 31)
}

const getFieldValue = (row: SubmissionRow, key: string): string => {
  if (key === 'selectedServices') {
    const payloadServices = row.payload?.selectedServices
    if (Array.isArray(payloadServices)) {
      return toText(payloadServices)
    }

    return toText(row.selected_services ?? [])
  }

  const payloadValue = row.payload?.[key]
  if (payloadValue !== undefined && payloadValue !== null) {
    return toText(payloadValue)
  }

  if (key === 'submittedAt') {
    return toText(row.submitted_at)
  }

  if (key === 'companyName') {
    return toText(row.company_name)
  }

  if (key === 'contactName') {
    return toText(row.contact_name)
  }

  if (key === 'email') {
    return toText(row.client_email)
  }

  return ''
}

const buildWorkbookBuffer = (rows: SubmissionRow[]): Uint8Array => {
  const workbook = XLSX.utils.book_new()

  const summaryHeaders = ['Submission ID', ...FIELD_MAP.map((item) => item.header)]
  const summaryRows = rows.map((row) => {
    return [row.id, ...FIELD_MAP.map((field) => getFieldValue(row, field.key))]
  })

  const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows])
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'All Submissions')

  const grouped = new Map<string, SubmissionRow[]>()
  for (const row of rows) {
    const rawName =
      toText(row.payload?.companyName) ||
      toText(row.company_name) ||
      toText(row.payload?.contactName) ||
      toText(row.contact_name) ||
      `Client ${row.id}`

    const name = sheetSafeName(rawName)
    const current = grouped.get(name) ?? []
    current.push(row)
    grouped.set(name, current)
  }

  for (const [name, clientRows] of grouped.entries()) {
    const clientSheetRows = clientRows.map((row) => {
      return [row.id, ...FIELD_MAP.map((field) => getFieldValue(row, field.key))]
    })

    const worksheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...clientSheetRows])
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  }

  const content = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  return new Uint8Array(content as ArrayBuffer)
}

const ensureBucketAndUpload = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  file: Uint8Array,
) => {
  const storage = supabaseAdmin.storage.from(STORAGE_BUCKET)

  const attemptUpload = async () =>
    await storage.upload(STORAGE_PATH, file, {
      upsert: true,
      contentType: CONTENT_TYPE,
    })

  let uploadResult = await attemptUpload()
  if (!uploadResult.error) {
    return
  }

  if (!/bucket/i.test(uploadResult.error.message)) {
    throw new Error(`Storage upload failed: ${uploadResult.error.message}`)
  }

  const { error: createBucketError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
    public: false,
  })

  if (createBucketError && !/already exists/i.test(createBucketError.message)) {
    throw new Error(`Unable to create storage bucket: ${createBucketError.message}`)
  }

  uploadResult = await attemptUpload()
  if (uploadResult.error) {
    throw new Error(`Storage upload failed: ${uploadResult.error.message}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const requiredToken = Deno.env.get('EXPORT_ACCESS_TOKEN')
    if (requiredToken) {
      const providedToken =
        url.searchParams.get('token') ?? req.headers.get('x-export-token') ?? ''

      if (providedToken !== requiredToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabaseAdmin
      .from('client_profile_submissions')
      .select('id, created_at, submitted_at, company_name, contact_name, client_email, selected_services, payload')
      .order('submitted_at', { ascending: false })

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    const rows = (data ?? []) as SubmissionRow[]
    const file = buildWorkbookBuffer(rows)

    await ensureBucketAndUpload(supabaseAdmin, file)

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(STORAGE_PATH, SIGNED_URL_TTL_SECONDS)

    if (signedError || !signedData?.signedUrl) {
      throw new Error(
        `Could not create signed URL: ${signedError?.message ?? 'Unknown storage error'}`,
      )
    }

    if (url.searchParams.get('download') === '1') {
      return Response.redirect(signedData.signedUrl, 302)
    }

    return new Response(
      JSON.stringify({
        message: 'Master workbook generated successfully.',
        rowCount: rows.length,
        workbookPath: `${STORAGE_BUCKET}/${STORAGE_PATH}`,
        downloadUrl: signedData.signedUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
