import {NextRequest, NextResponse} from 'next/server'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import {getGoogleAIClient} from '@/lib/ai-config'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('Export-PDF: received request')
    const {templateData, pageSize, filename} = await request.json()

    if (!templateData) {
      return NextResponse.json({message: 'Template data is required'}, {status: 400})
    }
    const debugMode = Boolean(templateData.debug)

    // Load PDF HTML template
    const templatePath = path.resolve(process.cwd(), 'pdf_template.html')
    const templateHtml = fs.readFileSync(templatePath, 'utf-8')

    // Use Google Gemini to replace placeholders in template
    const aiClient = getGoogleAIClient()
    const model = aiClient.getGenerativeModel({model: 'gemini-1.5-flash'})
    // Build prompt for template rendering
    const systemPrompt = `You are an HTML templating engine. Given the HTML template and JSON data, replace all placeholders of the form {{key}} with the corresponding values. Return only the final HTML.`
    const userPrompt = `TEMPLATE:\n${templateHtml}\n\nDATA:\n${JSON.stringify(templateData)}`
    const aiResult = await model.generateContent([
      systemPrompt,
      userPrompt
    ])
    const fullHtml = aiResult.response.text()
    console.log(`Export-PDF: generated HTML content length ${fullHtml.length}`)
    if (debugMode) {
      return NextResponse.json({html: fullHtml})
    }

    // Launch Chromium and render the template
    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']})
    const page = await browser.newPage()
    // Set the HTML content and wait until it's fully loaded
    // Render page content
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    console.log('Export-PDF: page.setContent done')
    // Apply screen media type
    await page.emulateMediaType('screen')
    console.log('Export-PDF: page.emulateMediaType done')
    // Force exact color rendering
    await page.addStyleTag({content: 'html { -webkit-print-color-adjust: exact; }'})
    console.log('Export-PDF: page.addStyleTag done')
    // Optional delay to allow late loads
    console.log('Export-PDF: page.waitForTimeout done')
    // Generate PDF buffer
    console.log('Export-PDF: page.pdf() starting')
    const pdfBuffer = await page.pdf({
      format: pageSize === 'Letter' ? 'letter' : 'a4',
      margin: {top: '1in', right: '1in', bottom: '1in', left: '1in'},
      printBackground: true,
      preferCSSPageSize: true
    })
    console.log('Export-PDF: page.pdf() completed, buffer length', pdfBuffer.length)
    await browser.close()

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'document'}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF export error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    const errStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
        {message: errMsg, stack: errStack},
      { status: 500 }
    )
  }
}
