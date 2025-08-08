import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { marked } from 'marked'

export async function POST(request: NextRequest) {
  try {
    const { markdown, pageSize, filename } = await request.json()

    if (!markdown) {
      return NextResponse.json(
        { message: 'Markdown content is required' },
        { status: 400 }
      )
    }

    // Convert markdown to HTML
    const html = marked(markdown)
    
    // Create full HTML document with proper styling
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Worksheet</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: none;
              margin: 0;
              padding: 1in;
            }
            h1, h2, h3 { 
              color: #2563eb; 
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            h1 { font-size: 1.5em; }
            h2 { font-size: 1.3em; }
            h3 { font-size: 1.1em; }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: 600;
            }
            hr {
              border: none;
              border-top: 2px solid #e5e7eb;
              margin: 2em 0;
            }
            .page-break {
              page-break-before: always;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

    // Generate PDF with proper page settings
    const pdfBuffer = await page.pdf({
      format: pageSize === 'Letter' ? 'letter' : 'a4',
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      },
      printBackground: true,
      preferCSSPageSize: true
    })

    await browser.close()

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'worksheet'}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json(
      { message: 'Failed to export PDF. Please try again.' },
      { status: 500 }
    )
  }
}
