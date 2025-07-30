import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  body?: string
  html?: string
  from?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body, html, from = 'noreply@copytrading.com' } = await req.json()

    // Accept either 'body' or 'html' parameter
    const emailContent = body || html

    if (!to || !subject || !emailContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: to, subject, body (or html)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Sending email to:', to)
    console.log('   Subject:', subject)
    console.log('   From:', from)

    // For now, just log the email (you can integrate with a real email service later)
    console.log('📧 EMAIL CONTENT:')
    console.log('   To:', to)
    console.log('   From:', from)
    console.log('   Subject:', subject)
    console.log('   Content:', emailContent.substring(0, 100) + '...')

    // TODO: Integrate with email service like SendGrid, Mailgun, etc.
    // For now, we'll just simulate success

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully (simulated)',
        to,
        subject,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('❌ Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 