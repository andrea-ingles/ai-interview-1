import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzeResponse(transcription, question, more, analysisPrompts) {
  try {
    const systemPrompt = `You are an expert HR interviewer analyzing candidate responses. 
    Provide structured analysis in JSON format with the following fields:
    - redFlags (array of strings or empty if none have been identified; be concise and don' use vague wording; don't include the information that is lacking in the answer)
    - doubts (array of strings or empty if none have been identified; include the information that is lacking in the answer or wasn't specific or concise enough)
    - keyStrengths (array of strings)
    - recommendation (Hire/Maybe/Pass)
    - overallScore (1-10)
    - confidence (of the overallScore in %)
    - reasoning (5-10 word sentence that summaries the key points that explain the overallScore)
    
    Question asked: "${question}"
    ${more ? `Specific answer criteria or expected answer: ${more}` : ""}
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

export async function generatedBasicAssessment(basicQuestions, basicAnswers, candidateName, jobTitle, jobCompany){
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing the assessment to see if a candidate aligns on the basic requirements before entering to the walk-through resume assessement.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - reqMet (1 sentence assessment on how much all the requirements are met)
    - summary (2-3 sentence assessment)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    
    Individual Questions:
    ${JSON.stringify(basicQuestions, null, 2)}

    Individual Analyses to the previous questions:
    ${JSON.stringify(basicAnswers, null, 2)}
    
    Provide assessment for the required experience:`

    console.log('Basic system Prompt: ', systemPrompt)
    console.log('Basic user Prompt: ', userPrompt)

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
    console.error('Required experience assessment error:', error)
    throw new Error('Failed to generate required experience assessment')
  }
}

export async function generateCheckExperienceAssessment(allQuestions, allAnalyses, candidateName, jobTitle, jobCompany) {
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing the assessment to see if a candidate aligns on the required experience before entering to the walk-through resume assessement.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - yearsExperience (years of experience relevant to the job position)
    - summary (2-3 sentence assessment)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    
    Individual Questions:
    ${JSON.stringify(allQuestions, null, 2)}

    Individual Analyses to the previous questions:
    ${JSON.stringify(allAnalyses, null, 2)}
    
    Provide assessment for the required experience:`

    console.log('Exp System Prompt: ', systemPrompt)
    console.log('Exp User Prompt: ', userPrompt)

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
    console.error('Required experience assessment error:', error)
    throw new Error('Failed to generate required experience assessment')
  }
}

export async function generatedResumeAssessment(resumeQuestions, resumeAnswers, candidateName, jobTitle, jobCompany){
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing the assessment on the walk-through resume assessement.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - logicalProgression (The career tell a coherent story? Each move should make sense (more responsibility, new skills, better opportunities))
    - intentionality (Did the candidate make deliberate choices or just drift?)
    - growthMindset (Are they building toward something?)
    - impact (an array where each role described is an entry, what did they actually accomplish?)
    - scope (an array where each role described is an entry, team size, budget, project scale)
    - responsabilityLevel (an array where each role described is an entry, were they executing or leading?)
    - relevance (an array where each role described is an entry, how closely does this align with the target role?)
    - employmentGaps (are they any employments gaps of more than 6 months? How did they justify them?)
    - jobHopping (were they employed in multiple roles under 1-2 years? How did they justify it?)
    - careerPivots (did they pivot to different sectors or unrelated roles? How did they justify it?)
    - decrease (did they title or responsability decrease in any transition between roles? How did they justify it?)
    - technicalSkills (did they speak credibly about their technical skills?)
    - summary (2-3 sentence assessment)
    - redFlags (string or null; concise, no vague words)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    
    Individual Questions:
    ${JSON.stringify(resumeQuestions, null, 2)}

    Individual Analyses to the previous questions:
    ${JSON.stringify(resumeAnswers, null, 2)}
    
    Provide assessment for the required experience:`

    console.log('Resume system Prompt: ', systemPrompt)
    console.log('Resume user Prompt: ', userPrompt)

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
    console.error('Required experience assessment error:', error)
    throw new Error('Failed to generate required experience assessment')
  }
}
export async function generatedMotivationAssessment(motivationQuestions, motivationAnswers, candidateName, jobTitle, jobCompany){
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing the assessment to see if a candidate is interested and motivated in the role.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - summary (1 sentence assessment answering the question "Do they show clear enthusiasm and motivation for the role?", be specific and concise)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    
    Individual Questions:
    ${JSON.stringify(motivationQuestions, null, 2)}

    Individual Analyses to the previous questions:
    ${JSON.stringify(motivationAnswers, null, 2)}
    
    Provide assessment for the required experience:`

    console.log('Motivation system Prompt: ', systemPrompt)
    console.log('Motivation user Prompt: ', userPrompt)

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
    console.error('Required experience assessment error:', error)
    throw new Error('Failed to generate required experience assessment')
  }
}
export async function generatedSoftSkillsAssessment(softSkillsQuestions, softSkillsAnswers, candidateName, jobTitle, jobCompany){
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing the assessment to see if a candidate is interested and motivated in the role.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    - summary (1 sentence assessment with any variation or the mix of these two templates "Strong in X, light on Y" and/or "Doesn't have the skills that the role require", be specific and concise)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    
    Individual Questions:
    ${JSON.stringify(softSkillsQuestions, null, 2)}

    Individual Analyses to the previous questions:
    ${JSON.stringify(softSkillsAnswers, null, 2)}
    
    Provide assessment for the required experience:`

    console.log('Soft-Skills system Prompt: ', systemPrompt)
    console.log('Soft-Skills user Prompt: ', userPrompt)

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
    console.error('Required experience assessment error:', error)
    throw new Error('Failed to generate required experience assessment')
  }
}

export async function generateOverallAssessmentPersonalized(allAnalyses, candidateName, jobTitle, jobCompany, companyCulture, keySkills) {
  try {
    console.log(' Preparant el Assessment...')
    const systemPrompt = `You are an expert HR consultant providing an overall assessment of a candidate.
    Create a comprehensive evaluation report in JSON format with:
    - overallScore (1-100)
    ${keySkills ? `- skillEvaluations (a list with the key as the name of the skill and the value as a number 1-10 for the evaluation of the skill, don't add any other skills that are not in the list: ${keySkills})` : ''}
    - yearsExperience (years of experience relevant to the job position)
    ${ companyCulture ? `- numCultureFit (evaluation 1-10 of culture fit)` : ''}
    ${ companyCulture ? `- evalCultureFit (2-3 sentences about the reasoning of your evaluation of culture fit)` : ''}
    - summary (2-3 sentence overall assessment)`

    const userPrompt = `
    Job: ${jobTitle} at ${jobCompany}
    Candidate: ${candidateName}
    ${companyCulture ? `Company culture: ${companyCulture}` : ''}
    
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
