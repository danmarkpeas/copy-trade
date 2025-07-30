import { createClient } from '@supabase/supabase-js'

export interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendAccountCreationEmail(
  email: string, 
  accountType: 'broker' | 'follower', 
  accountName: string
) {
  try {
    const { subject, htmlContent } = generateEmailContent(email, accountType, accountName)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables for email')
      throw new Error('Email service not configured')
    }
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`
    
    console.log('📧 Sending email via Supabase Edge Function...')
    console.log('  To:', email)
    console.log('  Subject:', subject)
    console.log('  Edge Function URL:', edgeFunctionUrl)
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: subject,
        html: htmlContent
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Email service error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ Email sent successfully via Edge Function:', result)
    
    return result
    
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    throw error
  }
}

function generateEmailContent(
  email: string, 
  accountType: 'broker' | 'follower', 
  accountName: string
) {
  const subject = `Account Created Successfully - ${accountType} Account`
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Created Successfully</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Account Created Successfully!</h1>
        </div>
        <div class="content">
          <h2>Welcome to Copy Trading Platform</h2>
          <p>Dear User,</p>
          <p>Your ${accountType} account <strong>"${accountName}"</strong> has been successfully created and is now ready for use.</p>
          
          <h3>Account Details:</h3>
          <ul>
            <li><strong>Account Type:</strong> ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}</li>
            <li><strong>Account Name:</strong> ${accountName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Status:</strong> Active</li>
            <li><strong>Created:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          
          <h3>Next Steps:</h3>
          <p>You can now:</p>
          <ul>
            <li>Access your dashboard to manage your account</li>
            <li>Configure your trading preferences</li>
            <li>Start connecting with other traders</li>
            <li>Monitor your account performance</li>
          </ul>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/dashboard" class="button">
              Access Your Dashboard
            </a>
          </p>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>
          The Copy Trading Platform Team</p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}</p>
          <p>&copy; 2025 Copy Trading Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  return { subject, htmlContent }
} 