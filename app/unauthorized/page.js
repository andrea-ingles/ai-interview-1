export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-red-600">Unauthorized</h1>
        <p className="text-gray-600 mb-6">
          You don’t have permission to access this page.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}