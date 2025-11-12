//file: app/api/responses/save/route.js
import { supabase } from '../../../../lib/authServer.js'
import { 
    generateOverallAssessmentPersonalized,
    generatedBasicAssessment,
    generateCheckExperienceAssessment,
    generatedMotivationAssessment,
    generatedSoftSkillsAssessment 
} from '../../../../lib/ai-analysis.js'
import { NextResponse } from 'next/server'
//import { createClient } from '@supabase/supabase-js'



/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// ✅ Helper: update candidate completion time
async function markCandidateComplete(supabase, interviewId, jobTitle, jobCompany, companyCulture, keySkills, candidateId, interviewInstanceId, candidateName) {

    // Trigger overall analysis personalized      
    if (!interviewId || !jobTitle || !jobCompany || !candidateId || !interviewInstanceId || !candidateName) {
        console.log('Required parameters:')
        console.log('interviewId:', interviewId)
        console.log('jobTitle:', jobTitle)
        console.log('jobCompany:', jobCompany)
        console.log('companyCulture:', companyCulture)
        console.log('keySkills:', keySkills)
        console.log('candidateId:', candidateId)
        console.log('interviewInstanceId:', interviewInstanceId)
        console.log('candidateName:', candidateName)
        throw new Error('Lacked information to query for the overall analysis personalized')
    }

    console.log('Required parameters:')
    console.log('interviewId:', interviewId)
    console.log('jobTitle:', jobTitle)
    console.log('jobCompany:', jobCompany)
    console.log('companyCulture:', companyCulture)
    console.log('keySkills:', keySkills)
    console.log('candidateId:', candidateId)
    console.log('interviewInstanceId:', interviewInstanceId)
    console.log('candidateName:', candidateName)

    // All AI analysis from responses for an instance
    const { data, error: allAIAnalysisError } = await supabase
        .from('responses')
        .select('ai_analysis,interview_question_id')
        .eq('interview_candidate_id', interviewInstanceId);
    
    if (allAIAnalysisError) {
        console.log('❌ Interview not found:', allAIAnalysisError)
        throw new Error('Could not update instance', allAIAnalysisError)
    }
    console.log('data from responses: ', data)

    const allAnalyses = data
        .map(item => item.ai_analysis)
        .filter(Boolean);
    console.log('data formatted from responses: ', allAnalyses)
      
    // Analyze overall responses with AI
    const overallAnalysis = await generateOverallAssessmentPersonalized(allAnalyses, candidateName, jobTitle, jobCompany, companyCulture, keySkills)

    if (!overallAnalysis){
        console.log('Error: AI analysis failed')
    }

    // Extract question IDs that have analysis
    const questionIds = data
        .filter(item => item.ai_analysis)
        .map(item => item.interview_question_id);

    // Fetch all questions with their categories
    const { data: questions, error: allQuestionsError } = await supabase
        .from('interview_questions')
        .select('*')
        .in('id', questionIds);

    if (allQuestionsError) {
        console.log('❌ Questions not found:', allQuestionsError)
        throw new Error('Could not fetch questions', allQuestionsError)
    }

    // Create a map for quick lookup: questionId -> category
    const questionCategoryMap = Object.fromEntries(
        questions.map(q => [q.id, q.category])
    );

    // Group responses by category, maintaining order
    const responsesByCategory = {
        basic: { questions: [], answers: [] },
        experience: { questions: [], answers: [] },
        resume: { questions: [], answers: [] },
        motivation: { questions: [], answers: [] },
        soft_skills: { questions: [], answers: [] }
    };

    // Iterate through responses in order and group by category
    data.forEach((response, index) => {
        if (!response.ai_analysis) return; // Skip responses without analysis
        
        const category = questionCategoryMap[response.interview_question_id];
        
        if (category && responsesByCategory[category]) {
            const question = questions.find(q => q.id === response.interview_question_id);
            responsesByCategory[category].questions.push(question);
            responsesByCategory[category].answers.push(response.ai_analysis);
        }
    });

    // Extract arrays for easy access
    const basicQuestions = responsesByCategory.basic.questions;
    const basicAnswers = responsesByCategory.basic.answers;

    const experienceQuestions = responsesByCategory.experience.questions;
    const experienceAnswers = responsesByCategory.experience.answers;

    const resumeQuestions = responsesByCategory.resume.questions;
    const resumeAnswers = responsesByCategory.resume.answers;

    const motivationQuestions = responsesByCategory.motivation.questions;
    const motivationAnswers = responsesByCategory.motivation.answers;

    const softSkillsQuestions = responsesByCategory.soft_skills.questions;
    const softSkillsAnswers = responsesByCategory.soft_skills.answers;

    console.log('Basic:', { questions: basicQuestions.length, answers: basicAnswers.length });
    console.log('Experience:', { questions: experienceQuestions.length, answers: experienceAnswers.length });
    console.log('Resume:', { questions: resumeQuestions.length, answers: resumeAnswers.length });
    console.log('Motivation:', { questions: motivationQuestions.length, answers: motivationAnswers.length });
    console.log('Soft Skills:', { questions: softSkillsQuestions.length, answers: softSkillsAnswers.length });


    // Analyze each section
    const sectionAnalyses = await Promise.all([
        generatedBasicAssessment(basicQuestions, basicAnswers, candidateName, jobTitle, jobCompany),
        generateCheckExperienceAssessment(experienceQuestions, experienceAnswers, candidateName, jobTitle, jobCompany),
        generatedMotivationAssessment(motivationQuestions, motivationAnswers, candidateName, jobTitle, jobCompany),
        generatedSoftSkillsAssessment(softSkillsQuestions, softSkillsAnswers, candidateName, jobTitle, jobCompany)
    ])

    // Mark interview_candidates as completed and store overall analysis 
    const { data: instance, error: instanceError } = await supabase
        .from('interview_candidates')
        .update({ 
            completed_at: new Date().toISOString(),
            status: 'completed',
            overall_ai_analysis: overallAnalysis,
            section_analysis: sectionAnalyses
            })
        .eq('interview_id', interviewId)
        .eq('candidate_id', candidateId)
        .select()
        .single()
    
    if (instanceError) {
        console.log('❌ Interview not found:', instanceError)
        return {instance:null, error:instanceError}
    } else {
        return {instance, error:null}
    }
    
}



// POST method - Save response
export async function POST(request) {
  try{
    console.log('💾 Save response endpoint called')

    const { 
        sessionId, 
        position,
        category, 
        step,
        interviewInstanceId
     } = await request.json()
    console.log('📋 Save request params:', { sessionId, position, category, step, interviewInstanceId })

    if (!sessionId || position === undefined ||  category === undefined || !interviewInstanceId) {
        return NextResponse.json({ error: 'Missing required fields' }, {status: 400})
    }

    // Get instance of the interview and candidate.id
    console.log('🔍 Getting instance of interview for interviewInstanceId:', interviewInstanceId)
    const { data: instance, error: instanceError } = await supabase
        .from('interview_candidates')
        .select('candidate_id')
        .eq('id', interviewInstanceId)
        .single()

    if (instanceError) {
        console.log('❌ Instance not found:', instanceError)
        return NextResponse.json({ error: 'Instance not found' }, {status: 404})
    }


    // Get interview
    console.log('🔍 Getting interview for sessionId:', sessionId)
    const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .select('*')
        .eq('session_id', sessionId)
        .single()

    if (interviewError) {
        console.log('❌ Interview not found:', interviewError)
        return NextResponse.json({ error: 'Interview not found' }, {status: 404})
    }

    // Get interview_questions
    console.log('🔍 Getting interview questions for position ', position, ', category ' , category, ' and interview_id:', interview.id)
    const { data: interviewQuestion, error: questionError } = await supabase
        .from('interview_questions')
        .select('id')
        .eq('interview_id', interview.id)
        .eq('position', position)
        .eq('category', category)
        .single()

    if (questionError) {
        console.log('❌ Interview not found:', questionError)
        return NextResponse.json({ error: 'Question not found' }, {status: 404})
    }
    console.log('🔍 Getting candidate for interview:', interview.id)
    const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', instance.candidate_id)
        .single()

    if (candidateError) {
        console.log('❌ Candidate not found:', candidateError)
        return NextResponse.json({ error: 'Candidate not found' }, {status: 404})
    }

    // Check if response already exists
    console.log('🔍 Checking for existing response...')
    const { data: existingResponse, error: checkError } = await supabase
        .from('responses')
        .select('id')
        .eq('interview_question_id', interviewQuestion.id)
        .eq('interview_candidate_id', interviewInstanceId)
        .maybeSingle()
    
    if (checkError) throw checkError

    let response

    if (existingResponse) {
        console.log('🔄 Updating existing response:', existingResponse.id)
        // Update existing response
        const { data: updatedResponse, error: updateError } = await supabase
            .from('responses')
            .update({
            updated_at: new Date().toISOString()
            })
            .eq('id', existingResponse.id)
            .select()
            .single()

        if (updateError) throw updateError

        response = updatedResponse

    } else {
        console.log('➕ Creating new response...')
        // Create new response
        const { data: newResponse, error: insertError } = await supabase
            .from('responses')
            .insert({
            interview_question_id: interviewQuestion.id,
            video_url: null, // Will be updated when video is uploaded
            recorded_at: new Date().toISOString(),
            interview_candidate_id: interviewInstanceId
            })
            .select()
            .single()

        if (insertError) throw insertError
        response = newResponse
    }

    console.log('✅ Response saved successfully:', response.id)
    
    // ✅ If interview is complete, update candidate completion timestamp
    if (step === 'complete') {
        console.log('⏰ Interview marked complete — updating candidate completion time...')
        const { data: updatedInstance, error: completionError } =
            await markCandidateComplete(supabase, interview.id, interview.job_title, interview.company_name, interview.company_culture, interview.key_skills, candidate.id, interviewInstanceId, candidate.name)

        if (completionError) {
            console.error('❌ Failed to update candidate completion time:', completionError)
        } else {
            console.log('✅ Candidate completion time updated at:', updatedInstance?.completed_at)
        }
    }

    return NextResponse.json({ 
      success: true, 
      response: response 
    }, {status: 200})

  } catch (error) {
    console.error('💥 Save response error:', error)
    return NextResponse.json({ 
      error: 'Failed to save response',
      details: error.message 
    }, {status: 500})
  }
}