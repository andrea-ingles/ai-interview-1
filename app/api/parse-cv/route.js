//file: app/api/parse-cv/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'



export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('cv')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const pdfData = require('pdfdataextract')
    const extractor = new pdfData.PdfDataExtractor()
    const parsed = await extractor.extract(buffer, {
        get:{ 
          pages: true,
          text: true,
          info: true,
        }})
    
    // Parse CV text into structured format (basic extraction)
    const cvData = {
      rawText: parsed.text,
      extractedAt: new Date().toISOString(),
      metadata: {
        pages: parsed.pages,
        info: parsed.info
      }
      // Add more sophisticated parsing here (e.g., using AI/NLP)
    }
    console.log('cvData: ', cvData)
    return NextResponse.json(cvData)

  } catch (error) {
    console.error('CV parsing error:', error)
    return NextResponse.json({ error: 'Failed to parse CV' }, { status: 500 })
  }
}