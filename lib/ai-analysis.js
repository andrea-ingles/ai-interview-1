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
    - redFlags (string description or "None identified")
    - keyStrengths (array of strings)
    - recommendation (Hire/Maybe/Pass)
    - reasoning (detailed explanation)
    
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

export async function generateOverallAssessmentPersonalized(allAnalyses, candidateName, jobTitle, jobCompany, companyCulture, keySkills) {
  try {
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
