import '../styles/globals.css'

export const metadata = {
    title: "AI-Interview Platform",
    description: "AI-powered interview platform prototype featuring admin authentication, streamlined interview setup, video recording with integrated audio transcription, and AI-assisted analysis with comprehensive results dashboard for interviewers."
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}