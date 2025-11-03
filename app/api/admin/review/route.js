import { NextResponse } from "next/server"
import { supabase } from '../../../../lib/authServer.js'
import { withAdminAuth } from '../../../../lib/authMiddleware.js'

// ✅ PUT: update candidate review fields (status, scores, notes, etc.)
async function putHandler(req, { params, user }) {
    try {
        const { interviewId, candidateId, updates } = await req.json()
        console.log('Required parameters:')
        console.log('interviewId:',interviewId)
        console.log('candidateId:',candidateId)
        console.log('updates:',updates)

        // ✅ Step 1: Update data
        const { data, error } = await supabase
            .from("interview_candidates")
            .update(updates)
            .eq("interview_id", interviewId)
            .eq("candidate_id", candidateId)
            .select()
            .single()


        if (error) throw error


        return NextResponse.json({ success: true, instance: data })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export const PUT = withAdminAuth(putHandler)


// ✅ GET: fetch next candidate (optional future extension)
async function getHandler() {
    return NextResponse.json({ message: "Endpoint OK" })
}

export const GET = withAdminAuth(getHandler)