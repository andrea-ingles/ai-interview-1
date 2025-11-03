import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzeResponse(transcription, question, analysisPrompts) {
  try {
    const systemPrompt = `You are an expert HR interviewer analyzing candidate responses. 
    Provide structured analysis in JSON format with the following fields:
    - communicationSkill (1-10)
    - enthusiasm (High/Medium/Low)
    - relevantExperience (Very Relevant/Somewhat Relevant/Not Relevant)
    - redFlags (array of strings or empty if none have been identified; be concise and don' use vague wording; don't include the information that is lacking in the answer)
    - doubts (array of strings or empty if none have been identified; include the information that is lacking in the answer or wasn't specific or concise enough)
    - keyStrengths (array of strings)
    - recommendation (Hire/Maybe/Pass)
    - overallScore (1-10)
    - confidence (of the overallScore in %)
    - reasoning (5-10 word sentence that summaries the key points that explain the overallScore)
    
    
    Question asked: "${question}"
    Analysis criteria: ${analysisPrompts.join(', ')}`

    const userPrompt = `Analyze this candidate response: "${transcription}"`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ⚙️ updated from "gpt-4"
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    return JSON.parse(completion.choices[0].message.content)
  } catch (error) {
    console.error('AI Analysis error:', error)
    throw new Error('Failed to analyze response')
  }
}

/**
 * Analyze a fully segmented transcript
 * @param {string} rawTranscription
 * @param {Array} formattedSegments [
 *   { id, start, end, text, title, redflag, doubt, factPlus, factMinus }
 * ]
 */
export async function analyzeTranscriptionSegments(rawTranscription, question, analysisPrompts, formattedSegments) {
  try {
    const systemPrompt = `
      You analyze candidate answers from video interviews.

      You receive:
      1) raw transcription
      2) segments split by meaning

      For EACH segment, detect:
      - redFlags: (string or null; concise, no vague words)
      - doubts: (string or null; missing/unclear info required)
      - summaryTitle: 3–5 words summary of what is said

      Question asked: "${question}"
      Analysis criteria: ${analysisPrompts.join(', ')}

      Return JSON in SAME segment array format:
      [
      { id, start, end, text, title, redflag, doubt, factPlus, factMinus }
      ]
      `

    const userPrompt = `
      RAW:
      ${rawTranscription}

      SEGMENTS:
      ${JSON.stringify(formattedSegments)}
      `

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })

    return JSON.parse(completion.choices[0].message.content).segments
  } catch (e) {
    console.error("Segment analysis error:", e)
    throw new Error("Failed to analyze segments")
  }
}

export async function generateOverallAssessmentPersonalized(allAnalyses, candidateName, jobTitle, jobCompany, companyCulture, keySkills) {
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing an overall assessment of a candidate.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - evaluation of each skill in this list (1-10): ${keySkills}
    - years of experience relevant to the job position
    - summary (2-3 sentence overall assessment)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    Company culture: ${companyCulture}
    
    Individual Question Analyses:
    ${JSON.stringify(allAnalyses, null, 2)}
    
    Provide overall assessment:`

    //console.log('System Prompt: ', systemPrompt)
    //console.log('User Prompt: ', userPrompt)

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ⚙️ updated model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
    //console.log('Responsta de chat gpt: ', completion)
    console.log("AI output: ", completion.choices[0].message.content)
    return JSON.parse(completion.choices[0].message.content)
  } catch (error) {
    console.error('Overall assessment error:', error)
    throw new Error('Failed to generate overall assessment')
  }
}

export async function fillLinkedinFacts(formattedSegments, linkedinBio, rawTranscription) {
  const prompt = `
    Compare candidate's statements to LinkedIn data.

    Return SAME segment array but fill:
    - factPlus: facts supported
    - factMinus: contradictions

    LinkedIn:
    ${linkedinBio}

    RAW:
    ${rawTranscription}

    SEGMENTS:
    ${JSON.stringify(formattedSegments)}
    `

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1
  })

  return JSON.parse(completion.choices[0].message.content).segments
}

export async function generateOverallAssessment(allAnalyses, candidateInfo, jobInfo) {
  try {
    const systemPrompt = `You are an expert HR consultant providing an overall assessment of a candidate.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - recommendation (Hire/Maybe/Pass)
    - strengths (array of key strengths)
    - concerns (array of concerns or empty if none)
    - fitForRole (High/Medium/Low)
    - nextSteps (recommended next actions)
    - summary (2-3 sentence overall assessment)`

    const userPrompt = `
    Job: ${jobInfo.title} at ${jobInfo.company}
    Candidate: ${candidateInfo.name}
    
    Individual Question Analyses:
    ${JSON.stringify(allAnalyses, null, 2)}
    
    Provide overall assessment:`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ⚙️ updated model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    return JSON.parse(completion.choices[0].message.content)
  } catch (error) {
    console.error('Overall assessment error:', error)
    throw new Error('Failed to generate overall assessment')
  }
}
