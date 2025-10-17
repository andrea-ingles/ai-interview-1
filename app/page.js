'use client'
import { useRouter } from 'next/navigation'

export default function Home() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                AI Video Interview System
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                Streamline your hiring process with AI-powered video interviews
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="space-y-4">
                        <button
                        onClick={() => router.push('/admin')}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                        Setup New Interview
                        </button>
                        
                        <div className="text-center text-sm text-gray-500">
                        or enter interview code to take interview
                        </div>
                        
                        <input
                        type="text"
                        placeholder="Interview Code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                            router.push(`/interview/${e.target.value.trim()}`)
                            }
                        }}
                        />
                    </div>
                </div>
            </div>
        </div>

    );
}
