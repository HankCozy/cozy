export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Cozy</h1>
          <p className="mt-2 text-gray-600">Community Authentication Platform</p>
        </div>
        <div className="text-center space-y-4">
          <p className="text-gray-500">Welcome to Cozy - a simple community authentication system.</p>
          <div className="space-y-2">
            <a
              href="/auth/login"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Login
            </a>
            <a
              href="/auth/register"
              className="block w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Register
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}