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
        interview_id,
        questions
    } = await request.json()

    // ✅ Step 3: Validate required fields
    if (!interview_id || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ✅ Step 4: Prepare questions data for batch insert
    const questionsToInsert = questions.map(q => ({
      interview_id: interview_id,
      short_name: q.short_name,
      question_text: q.question_text,
      position: q.position,
      tags_questions: q.tags_questions
    }))

    // ✅ Step 5: Insert into Supabase
    const { data, error } = await supabase
      .from('interview_questions')
      .insert(questionsToInsert)
      .select()

    if(error){
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
      console.log('Questions inserted')
      console.log('Questions:', data)
    }

    // ✅ Step 6: Return response
    return NextResponse.json({
      questions: data,
      count: data.length
    }, { status: 201 })

  } catch (error) {
    console.error('Create questions error:', error)
    return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 })
  }

}