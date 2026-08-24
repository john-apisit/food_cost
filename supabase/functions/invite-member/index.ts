import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type InviteBody = {
  store_id?: string
  email?: string
  role?: string
}

function log(step: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn: 'invite-member', step, ...data }))
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function inviteEmailHtml(params: {
  storeName: string
  roleLabel: string
  actionUrl: string
}) {
  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111827;">
      <p>คุณถูกเชิญให้ช่วยดูแลร้าน <strong>${escapeHtml(params.storeName)}</strong></p>
      <p>บทบาท: ${escapeHtml(params.roleLabel)}</p>
      <p>
        <a href="${params.actionUrl}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
          เปิดคำเชิญ
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">หากปุ่มกดไม่ได้ ให้เปิดลิงก์นี้:<br>${escapeHtml(params.actionUrl)}</p>
    </div>
  `
}

function resolveAppUrl(req: Request) {
  const configured = (Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || '').trim()
  if (configured) return configured.replace(/\/$/, '')
  const origin = (req.headers.get('origin') || '').trim()
  if (origin) return origin.replace(/\/$/, '')
  return 'http://localhost:5173'
}

function friendlyEmailError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('domain is not verified') || lower.includes('verify your domain')) {
    return 'โดเมนอีเมลผู้ส่งยังไม่ verified ใน Resend'
  }
  if (lower.includes('only send testing emails') || lower.includes('you can only send')) {
    return 'Resend โหมดทดสอบส่งได้เฉพาะอีเมลเจ้าของบัญชี — ต้อง verify โดเมนก่อน'
  }
  if (lower.includes('invalid api') || lower.includes('api key')) {
    return 'RESEND_API_KEY ไม่ถูกต้อง'
  }
  if (lower.includes('redirect')) {
    return 'APP_URL ไม่อยู่ใน Auth redirect URLs ของโปรเจกต์'
  }
  return message
}

async function sendResendEmail(params: {
  requestId: string
  apiKey: string
  from: string
  to: string
  subject: string
  html: string
}): Promise<{ ok: true; id?: string } | { ok: false; error: string; status: number }> {
  log('resend.request', {
    requestId: params.requestId,
    from: params.from,
    to: params.to,
    subject: params.subject,
  })
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  let body: Record<string, unknown> | string | null = null
  const raw = await response.text()
  try {
    body = raw ? JSON.parse(raw) as Record<string, unknown> : null
  } catch {
    body = raw || null
  }

  if (response.ok) {
    const id = body && typeof body === 'object' && typeof body.id === 'string' ? body.id : undefined
    log('resend.ok', { requestId: params.requestId, status: response.status, id })
    return { ok: true, id }
  }

  const message = body && typeof body === 'object' && typeof body.message === 'string'
    ? body.message
    : `Resend HTTP ${response.status}`
  log('resend.error', { requestId: params.requestId, status: response.status, body })
  return { ok: false, error: message, status: response.status }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()
  log('request.start', {
    requestId,
    method: req.method,
    origin: req.headers.get('origin'),
  })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const appUrl = resolveAppUrl(req)
    const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim()
    const fromEmail = (Deno.env.get('INVITE_FROM_EMAIL') ?? '').trim()
    log('config', {
      requestId,
      appUrl,
      hasResendKey: Boolean(resendKey),
      hasFromEmail: Boolean(fromEmail),
      fromEmail,
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      log('auth.missing', { requestId })
      return json({ error: 'ต้องเข้าสู่ระบบก่อน' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      log('auth.invalid', { requestId, error: userError?.message })
      return json({ error: 'เซสชันไม่ถูกต้อง' }, 401)
    }
    log('auth.ok', { requestId, userId: userData.user.id })

    const body = (await req.json()) as InviteBody
    const storeId = String(body.store_id || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const role = body.role === 'admin' ? 'admin' : 'store_manager'
    log('payload', { requestId, storeId, email, role })
    if (!storeId || !email.includes('@')) {
      log('payload.invalid', { requestId })
      return json({ error: 'กรุณากรอกอีเมลและเลือกร้านให้ครบ' }, 400)
    }

    const { data: membership } = await admin
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', userData.user.id)
      .maybeSingle()
    log('membership', { requestId, role: membership?.role ?? null })
    if (membership?.role !== 'admin') {
      log('membership.forbidden', { requestId })
      return json({ error: 'เฉพาะผู้ดูแลร้านเท่านั้นที่เชิญคนได้' }, 403)
    }

    const { data: store } = await admin
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single()
    log('store', { requestId, storeName: store?.name ?? null })

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    log('profile.lookup', { requestId, exists: Boolean(existingProfile), profileId: existingProfile?.id ?? null })

    if (existingProfile) {
      const { data: memberRow } = await admin
        .from('store_members')
        .select('id')
        .eq('store_id', storeId)
        .eq('user_id', existingProfile.id)
        .maybeSingle()
      if (memberRow) {
        log('member.exists', { requestId, memberId: memberRow.id })
        return json({ error: 'อีเมลนี้เป็นสมาชิกร้านนี้อยู่แล้ว' }, 400)
      }
    }

    const { data: invite, error: inviteError } = await admin
      .from('store_invites')
      .insert({
        store_id: storeId,
        email,
        role,
        invited_by: userData.user.id,
      })
      .select('id, token')
      .single()
    if (inviteError) {
      log('invite.insert_error', { requestId, message: inviteError.message, code: inviteError.code })
      if (inviteError.message.includes('idx_store_invites_pending_email')) {
        return json({ error: 'มีคำเชิญค้างสำหรับอีเมลนี้อยู่แล้ว' }, 400)
      }
      throw inviteError
    }
    log('invite.created', { requestId, inviteId: invite.id, token: invite.token })

    const acceptUrl = `${appUrl}/invite/${invite.token}`
    const roleLabel = role === 'admin' ? 'ผู้ดูแล' : 'ผู้จัดการร้าน'
    const storeName = store?.name || 'ร้านของคุณ'
    let emailSent = false
    let emailError: string | null = null

    if (resendKey) {
      if (!fromEmail) {
        emailError = 'ยังไม่ได้ตั้ง INVITE_FROM_EMAIL'
        log('resend.skip', { requestId, reason: emailError })
      } else {
        const sent = await sendResendEmail({
          requestId,
          apiKey: resendKey,
          from: fromEmail,
          to: email,
          subject: `เชิญเข้าร้าน ${storeName}`,
          html: inviteEmailHtml({ storeName, roleLabel, actionUrl: acceptUrl }),
        })
        if (sent.ok) {
          emailSent = true
          log('email.sent', { requestId, provider: 'resend', id: sent.id })
        } else {
          emailError = friendlyEmailError(sent.error)
          log('email.resend_failed', { requestId, status: sent.status, error: sent.error, friendly: emailError })
        }
      }
    } else {
      log('resend.skip', { requestId, reason: 'RESEND_API_KEY missing' })
    }

    if (!emailSent && !existingProfile) {
      log('auth_invite.start', { requestId, email, redirectTo: acceptUrl })
      const { error: inviteUserError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: acceptUrl,
        data: {
          invited_store_id: storeId,
          invite_token: invite.token,
        },
      })
      if (!inviteUserError) {
        emailSent = true
        emailError = null
        log('email.sent', { requestId, provider: 'supabase_auth' })
      } else {
        const authMessage = friendlyEmailError(inviteUserError.message)
        log('auth_invite.error', {
          requestId,
          message: inviteUserError.message,
          status: inviteUserError.status,
          friendly: authMessage,
        })
        emailError = emailError ? `${emailError} (Auth: ${authMessage})` : authMessage
      }
    } else if (!emailSent && existingProfile && !resendKey) {
      emailError = 'ตั้งค่า RESEND_API_KEY เพื่อส่งอีเมลให้ผู้ที่มีบัญชีอยู่แล้ว หรือคัดลอกลิงก์คำเชิญแทน'
      log('auth_invite.skip', { requestId, reason: 'existing profile without resend' })
    } else if (!emailSent && existingProfile) {
      log('auth_invite.skip', { requestId, reason: 'existing profile after resend failure' })
    }

    log('request.done', {
      requestId,
      inviteId: invite.id,
      emailSent,
      emailError,
      inviteUrl: acceptUrl,
    })
    return json({
      ok: true,
      email_sent: emailSent,
      email_error: emailError,
      invite_id: invite.id,
      token: invite.token,
      invite_url: acceptUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ส่งคำเชิญไม่สำเร็จ'
    log('request.error', { requestId, message, stack: error instanceof Error ? error.stack : undefined })
    return json({ error: message }, 500)
  }
})
