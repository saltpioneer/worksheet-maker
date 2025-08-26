import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteerCore from 'puppeteer-core'
import { marked } from 'marked'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ExportPDFRequest {
  markdown?: string
  pageSize: 'A4' | 'Letter'
  filename?: string
  // legacy support
  templateData?: Record<string, unknown>
  debug?: boolean
}

function cleanMarkdown(input: string): string {
  let text = input || ''
  // Remove common end markers and excessive whitespace
  text = text.replace(/^===.+?===\s*$/gim, '').trim()
  return text
}

function htmlForMarkdown(markdown: string, pageSize: 'A4' | 'Letter') {
  const body = marked.parse(cleanMarkdown(markdown)) as string
  // Minimal, consistent CSS. Avoid @page size so puppeteer "format" takes effect.
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Worksheet</title>
    <style>
      @page { margin: 1in; }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body { margin: 0; color: #111; background: #fff; font: 12pt/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .doc { max-width: 900px; margin: 0 auto; padding: 0 8px; }
      h1, h2, h3 { line-height: 1.2; margin: 0 0 10pt; }
      h1 { font-size: 22pt; }
      h2 { font-size: 16pt; border-bottom: 1px solid #e5e5e5; padding-bottom: 4pt; margin-top: 16pt; }
      h3 { font-size: 13pt; margin-top: 12pt; }
      p, ul, ol { margin: 8pt 0; }
      ul, ol { padding-left: 18pt; }
      hr { border: 0; border-top: 1px solid #ddd; margin: 12pt 0; }
      table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
      th, td { border: 1px solid #e5e5e5; padding: 6pt; vertical-align: top; }
      th { background: #f7f7f7; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 10pt; }
      pre { background: #fafafa; border: 1px solid #eee; padding: 8pt; overflow: auto; }
      blockquote { margin: 8pt 0; padding-left: 10pt; border-left: 3px solid #ddd; color: #333; }
      .headerline { font-size: 10pt; color: #444; margin: 6pt 0 12pt; display: flex; gap: 12pt; flex-wrap: wrap; }
      .headerline span { display: inline-block; min-width: 140px; }
    </style>
  </head>
  <body>
    <div class="doc">
      <div class="headerline">
        <span><strong>School:</strong> ______</span>
        <span><strong>Class:</strong> ______</span>
        <span><strong>Name:</strong> ______</span>
        <span><strong>Date:</strong> ______</span>
      </div>
      ${body}
    </div>
  </body>
  </html>`
}

export async function POST(request: NextRequest) {
  try {
    const { markdown, pageSize, filename, templateData, debug } = await request.json() as ExportPDFRequest
    console.log('Export-PDF: received request')

    if (!markdown && !templateData) {
      return NextResponse.json({ message: 'Markdown is required.' }, { status: 400 })
    }

    // Primary path: render Markdown into a clean HTML template
    const html = markdown ? htmlForMarkdown(markdown, pageSize) : htmlForMarkdown('# Document\n\nNo markdown provided.', pageSize)
    if (debug) return NextResponse.json({ html })

    // Launch Chromium and render the template
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION)

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
    ]

    const browser = isServerless
      ? await puppeteerCore.launch({
          args: [...chromium.args, ...launchArgs],
          executablePath: await chromium.executablePath(),
          headless: true,
        })
      : await (await import('puppeteer')).default.launch({
          headless: true,
          args: launchArgs,
        })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    console.log('Export-PDF: page.setContent done')
    await page.emulateMediaType('screen')
    console.log('Export-PDF: page.emulateMediaType done')
    await page.addStyleTag({ content: 'html { -webkit-print-color-adjust: exact; }' })
    console.log('Export-PDF: page.addStyleTag done')
    console.log('Export-PDF: page.waitForTimeout done')
    console.log('Export-PDF: page.pdf() starting')
    const pdfBuffer = await page.pdf({
      format: pageSize === 'Letter' ? 'letter' : 'a4',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      printBackground: true,
      // Let puppeteer format control page size for consistency
      preferCSSPageSize: false,
    })
    console.log('Export-PDF: page.pdf() completed, buffer length', pdfBuffer.length)
    await browser.close()

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'document'}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF export error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ message: errMsg }, { status: 500 })
  }
}
