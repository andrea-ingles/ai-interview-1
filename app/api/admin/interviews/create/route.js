import { supabase, getServerUser } from '../../../../../lib/authServer'
import { withAdminAuth } from '../../../../../lib/authMiddleware'
import { NextResponse } from 'next/server'
import { randomUUID  } from 'crypto'

const uuidv4 = () => randomUUID()

/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// POST method - Create new interview
export async function POST(request) {
  try {

    // ✅ Step 1: Authenticate admin user
    const { user, error: authError } = await getServerUser(request)
    if (authError || !user) {
      console.log(authError)
      console.log('user :', user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Step 2: Parse request body
    const {
      jobTitle,
      companyName,
      companyCulture,
      analysisPrompts,
      keySkills,
      nextSteps,
      timeLimit
    } = await request.json()

    // ✅ Step 3: Validate required fields
    if (!jobTitle || !companyName || !analysisPrompts || !keySkills || !companyCulture) {
      console.log('Required fields:')
      console.log('Job title:', jobTitle)
      console.log('Company name:', companyName)
      console.log('Company culture:', companyCulture)
      console.log('Analysis Prompts:', analysisPrompts)
      console.log('Key skills:', keySkills)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ✅ Step 4: Generate unique session ID
    const sessionId = `interview_${uuidv4()}`
    console.log('Generated sessionId:', sessionId)

    // ✅ Step 5: Insert into Supabase
    const { data: interview, interviewError } = await supabase
      .from('interviews')
      .insert({
        session_id: sessionId,
        job_title: jobTitle,
        company_name: companyName,
        company_culture: companyCulture,
        analysis_prompts: analysisPrompts,
        key_skills: keySkills,
        next_steps: nextSteps,
        time_limit: timeLimit || 120,
        //created_by: user.id // Associate with current user (admin)
      })
      .select()
      .single()

    if(interviewError){
      console.error('Insert failed:', {
        message: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code
      })


      return NextResponse.json(
          { error: 'Failed to create interview', details: error.message },
          { status: 500 }
        )

    }else{
      console.log(' Interview inserted')
      console.log('interview:', interview)
    }

    // ✅ Step 6: Construct public candidate link
    const interviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/interview/${sessionId}`

    // ✅ Step 7: Return response
    return NextResponse.json({
      sessionId,
      interviewUrl,
      interview: interview
    }, { status: 201 })

  } catch (error) {
    console.error('Create interview error:', error)
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 })
  }

}