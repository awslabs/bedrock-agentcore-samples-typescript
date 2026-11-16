import useAuth from './hooks/useAuth'
import Chat from './pages/Chat'

const runtimeUrl = import.meta.env.VITE_RUNTIME_URL
const localEndpoint = '/api/invocations'

function FullScreenMessage({ children }) {
  return <div className="flex items-center justify-center min-h-dvh bg-white px-6">{children}</div>
}

export default function App() {
  const isDeployed = Boolean(runtimeUrl)
  const { status, error, getAccessToken, signIn, signOut } = useAuth(isDeployed)

  if (status === 'error') {
    return (
      <FullScreenMessage>
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-xs max-w-md">
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
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Signing in…</p>
        </div>
      </FullScreenMessage>
    )
  }

  return isDeployed ? (
    <Chat endpoint={runtimeUrl} getAccessToken={getAccessToken} onSignOut={signOut} />
  ) : (
    <Chat endpoint={localEndpoint} />
  )
}
