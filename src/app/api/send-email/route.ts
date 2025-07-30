import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: to, subject, html' 
      }, { status: 400 })
    }

    // Log email details for debugging
    console.log('📧 Email Details:', {
      to,
      subject,
      htmlPreview: html.substring(0, 200) + '...',
      timestamp: new Date().toISOString()
    })

    // Simulate successful email sending
    console.log('✅ Email would be sent to:', to)
    console.log('✅ Subject:', subject)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email processed successfully',
      note: 'Email logged - configure email service for actual delivery',
      recipient: to,
      subject: subject
    })

  } catch (error) {
    console.error('❌ Email processing error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 