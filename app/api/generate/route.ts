import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getGoogleAIClient } from '@/lib/ai-config'
import { z } from 'zod'

const inputSchema = z.object({
  curriculum: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  topic: z.string().min(1),
  objectives: z.array(z.string()).min(1).max(3),
  duration: z.string().min(1),
  support_level_desc: z.string().min(1),
  core_level_desc: z.string().min(1),
  extension_level_desc: z.string().min(1),
  n_support: z.number().min(1).max(10),
  n_core: z.number().min(1).max(15),
  n_extension: z.number().min(1).max(10),
  constraints: z.string(),
  materials: z.string(),
  include_teacher_notes: z.boolean(),
  include_rubric: z.boolean(),
  page_size: z.enum(['A4', 'Letter']),
  max_pages: z.number().min(1).max(10)
})

// Simple rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10 // Increased for Google AI

  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { message: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const inputs = inputSchema.parse(body)

    // Create system prompt with template substitution
    const systemPrompt = `You are "Worksheet Maker v0": a teacher-first generator of PRINTABLE worksheets.

Your job: given a curriculum topic, create differentiated student worksheets + answer keys that can be exported to PDF with minimal editing.

RULES
- Output ONLY the worksheet content in Markdown. No chit-chat.
- Use ${inputs.page_size} with 1" margins. No images or links.
- Keep headings, numbering, and spacing consistent. Avoid overly long lines.
- Add a top header with: **School:** ______   **Class:** ______   **Name:** ______   **Date:** ______
- Three tiers of differentiation: Support, Core, Extension (unless overridden).
- Provide an Answer Key for every item.
- If diagrams are needed, describe them as text placeholders: [diagram: …].
- Keep to ≤ ${inputs.max_pages} pages total (soft limit). Prefer concise tasks over long prose.

INPUT
- Locale/Curriculum: ${inputs.curriculum}
- Subject: ${inputs.subject}
- Year/Grade: ${inputs.grade}
- Topic: ${inputs.topic}
- Learning objectives (bullets): ${inputs.objectives.map(obj => `• ${obj}`).join('\n')}
- Time available: ${inputs.duration}
- Difficulty per tier: ${inputs.support_level_desc} | ${inputs.core_level_desc} | ${inputs.extension_level_desc}
- Number of questions per tier: ${inputs.n_support} / ${inputs.n_core} / ${inputs.n_extension}
- Constraints & accommodations: ${inputs.constraints}
- Materials allowed: ${inputs.materials}
- Include teacher notes? ${inputs.include_teacher_notes}
- Include quick rubric? ${inputs.include_rubric}
- Page size: ${inputs.page_size}

OUTPUT FORMAT (exactly this structure)
# ${inputs.subject} — ${inputs.topic} (${inputs.grade})

**Aligned to:** ${inputs.curriculum}

**Learning objectives:**
${inputs.objectives.map(obj => `- ${obj}`).join('\n')}

**Time:** ${inputs.duration}   **Materials:** ${inputs.materials}

---

## SUPPORT

Brief intro (1–2 sentences) at an accessible reading level. Include scaffolds (sentence starters, worked example, vocabulary box).

### Questions (${inputs.n_support} items)
1) ...
2) ...
...

### Mini self-check
- I can…
- I need help with…

---

## CORE

One-sentence context. Balanced item types (MCQ/short answer/structured).

### Questions (${inputs.n_core} items)
1) ...
2) ...
...

---

## EXTENSION

Richer application or reasoning. Multi-step, pattern/generalization, or explain-your-thinking prompts.

### Questions (${inputs.n_extension} items)
1) ...
2) ...
...

---

## ANSWER KEY

- Support
  1) …
  2) …
- Core
  1) …
  2) …
- Extension
  1) …
  2) …

${inputs.include_rubric ? `---

## QUICK RUBRIC (4 levels)

| Criteria | Beginning | Developing | Proficient | Advanced |
|---|---|---|---|---|
| Accuracy | … | … | … | … |
| Reasoning/Working | … | … | … | … |
| Communication | … | … | … | … |` : ''}

${inputs.include_teacher_notes ? `---

## TEACHER NOTES (not for students)

- Misconceptions to watch: …
- Fast finishes: …
- Differentiation moves: …
- Standards mapping: …` : ''}

=== End of Worksheet ===`

    const googleAI = getGoogleAIClient()

    const { text } = await generateText({
      model: googleAI('gemini-1.5-pro'),
      system: systemPrompt,
      prompt: `Generate a complete worksheet following the exact format specified in the system prompt.`,
      maxTokens: 8000, // Gemini supports higher token limits
      temperature: 0.7,
    })

    return NextResponse.json({ markdown: text })

  } catch (error) {
    console.error('Generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      )
    }

    // Handle Google AI specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { message: 'Google AI API key is not configured or invalid. Please check your GOOGLE_GENERATIVE_AI_API_KEY environment variable.' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { message: 'API quota exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('safety') || error.message.includes('blocked')) {
        return NextResponse.json(
          { message: 'Content was blocked by safety filters. Please try different inputs.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { message: 'Failed to generate worksheet. Please try again.' },
      { status: 500 }
    )
  }
}
