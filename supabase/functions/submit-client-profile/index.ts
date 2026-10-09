import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ProfilePayload = {
  dateCreated?: string
  salesRep?: string
  marketingRep?: string
  graphicsItRep?: string
  companyName?: string
  industry?: string
  organizationType?: string
  contactName?: string
  marketingContact?: string
  marketingPhone?: string
  purchasingContact?: string
  purchasingPhone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  officePhone?: string
  fax?: string
  mobile?: string
  website?: string
  email?: string
  consultationDate?: string
  basicNeedsGoals?: string
  neededByFirst?: string
  noteFirst?: string
  primaryNeed?: string
  neededBySecond?: string
  noteSecond?: string
  selectedServices?: string[]
  submittedAt?: string
}

const toSafe = (value: unknown) => (value ? String(value) : '')

const toSheetRows = (payload: ProfilePayload): Array<[string, string]> => {
  const services = (payload.selectedServices ?? []).length
    ? payload.selectedServices!.join(', ')
    : ''

  return [
    ['Submitted At', toSafe(payload.submittedAt)],
    ['Date Created', toSafe(payload.dateCreated)],
    ['Sales Rep', toSafe(payload.salesRep)],
    ['Marketing Rep', toSafe(payload.marketingRep)],
    ['Graphics/IT Rep', toSafe(payload.graphicsItRep)],
    ['Company Name', toSafe(payload.companyName)],
    ['Industry', toSafe(payload.industry)],
    ['Organization Type', toSafe(payload.organizationType)],
    ['Contact Name', toSafe(payload.contactName)],
    ['Marketing Contact', toSafe(payload.marketingContact)],
    ['Marketing Phone', toSafe(payload.marketingPhone)],
    ['Purchasing Contact', toSafe(payload.purchasingContact)],
    ['Purchasing Phone', toSafe(payload.purchasingPhone)],
    ['Address', toSafe(payload.address)],
    ['City', toSafe(payload.city)],
    ['State', toSafe(payload.state)],
    ['Zip', toSafe(payload.zip)],
    ['Office Phone', toSafe(payload.officePhone)],
    ['Fax', toSafe(payload.fax)],
    ['Mobile', toSafe(payload.mobile)],
    ['Website', toSafe(payload.website)],
    ['Email', toSafe(payload.email)],
    ['Consultation Date', toSafe(payload.consultationDate)],
    ['Basic Needs / Goals', toSafe(payload.basicNeedsGoals)],
    ['Needed By (First)', toSafe(payload.neededByFirst)],
    ['Note (First)', toSafe(payload.noteFirst)],
    ['Primary Need', toSafe(payload.primaryNeed)],
    ['Needed By (Second)', toSafe(payload.neededBySecond)],
    ['Note (Second)', toSafe(payload.noteSecond)],
    ['Selected Services', services],
  ]
}

const buildExcelAttachment = (payload: ProfilePayload) => {
  const rows = [['Field', 'Value'], ...toSheetRows(payload)]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Client Profile')

  const content = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'base64',
  })

  const companyPart = toSafe(payload.companyName).trim().replace(/[^a-zA-Z0-9-_]+/g, '-')
  const fallback = `submission-${new Date().toISOString().slice(0, 10)}`
  const safeName = (companyPart || fallback).slice(0, 60)

  return {
    filename: `client-profile-${safeName}.xlsx`,
    content,
  }
}

const buildHtml = (payload: ProfilePayload) => {
  const services = (payload.selectedServices ?? []).length
    ? payload.selectedServices?.map((item) => `<li>${item}</li>`).join('')
    : '<li>None selected</li>'

  return `
    <h2>Client Profile Submission</h2>
    <p><strong>Submitted At:</strong> ${toSafe(payload.submittedAt)}</p>
    <p><strong>Company:</strong> ${toSafe(payload.companyName)}</p>
    <p><strong>Contact Name:</strong> ${toSafe(payload.contactName)}</p>
    <p><strong>Client Email:</strong> ${toSafe(payload.email)}</p>
    <p><strong>Office Phone:</strong> ${toSafe(payload.officePhone)}</p>
    <p><strong>Mobile:</strong> ${toSafe(payload.mobile)}</p>
    <p><strong>Address:</strong> ${toSafe(payload.address)}, ${toSafe(payload.city)}, ${toSafe(payload.state)} ${toSafe(payload.zip)}</p>
    <p><strong>Industry:</strong> ${toSafe(payload.industry)}</p>
    <p><strong>Organization Type:</strong> ${toSafe(payload.organizationType)}</p>
    <p><strong>Primary Need:</strong> ${toSafe(payload.primaryNeed)}</p>
    <p><strong>Basic Needs / Goals:</strong> ${toSafe(payload.basicNeedsGoals)}</p>
    <h3>Selected Services</h3>
    <ul>${services}</ul>
  `
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceEmail = Deno.env.get('SERVICE_EMAIL')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')

    if (!serviceEmail || !resendApiKey || !fromEmail) {
      return new Response(
        JSON.stringify({
          error: 'Missing SERVICE_EMAIL, RESEND_API_KEY, or RESEND_FROM_EMAIL secret.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const payload = (await req.json()) as ProfilePayload

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

    const { error: insertError } = await supabaseAdmin.from('client_profile_submissions').insert({
      company_name: payload.companyName ?? null,
      client_email: payload.email,
      contact_name: payload.contactName ?? null,
      submitted_at: payload.submittedAt ?? new Date().toISOString(),
      payload,
      selected_services: payload.selectedServices ?? [],
    })

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    const html = buildHtml(payload)
    const excelAttachment = buildExcelAttachment(payload)

    const sendEmail = async (to: string) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject: `Client Profile Submission - ${payload.companyName || payload.contactName || 'New Client'}`,
          html,
          attachments: [excelAttachment],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Email send failed for ${to}: ${text}`)
      }
    }

    await sendEmail(serviceEmail)

    return new Response(
      JSON.stringify({
        message: 'Client profile submitted and sent to service@1ststepbranding.com.',
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
