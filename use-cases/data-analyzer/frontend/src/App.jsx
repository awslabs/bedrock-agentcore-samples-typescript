import useAuth from './hooks/useAuth'
import Chat from './pages/Chat'

const RUNTIME_URL = import.meta.env.VITE_RUNTIME_URL
const LOCAL_ENDPOINT = '/api/invocations'

function FullScreenMessage({ children }) {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100 px-6">
      {children}
    </div>
  )
}

export default function App() {
  const isDeployed = Boolean(RUNTIME_URL)
  const { status, error, getAccessToken, signIn, signOut } = useAuth(isDeployed)

  if (status === 'error') {
    return (
      <FullScreenMessage>
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Sign-in failed</h3>
          <p className="text-red-600 text-sm mb-4 break-words">{error}</p>
          <button onClick={signIn} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Try again
          </button>
        </div>
      </FullScreenMessage>
    )
  }

  if (status === 'signing-in') {
    return (
      <FullScreenMessage>
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Signing in…</p>
        </div>
      </FullScreenMessage>
    )
  }

  return isDeployed ? (
    <Chat endpoint={RUNTIME_URL} getAccessToken={getAccessToken} onSignOut={signOut} />
  ) : (
    <Chat endpoint={LOCAL_ENDPOINT} />
  )
}
