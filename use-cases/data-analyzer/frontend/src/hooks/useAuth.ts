import { useEffect, useRef, useState } from 'react'

const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
const clientId = import.meta.env.VITE_CLIENT_ID
const redirectUri = `${window.location.origin}/callback`
const pendingSignInKey = 'data-analyzer-pending-sign-in'

type AuthStatus = 'disabled' | 'signing-in' | 'signed-in' | 'error'

interface Tokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface Auth {
  status: AuthStatus
  error: string | null
  getAccessToken: () => Promise<string | null>
  signIn: () => Promise<void>
  signOut: () => void
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function randomString(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))
}

// Authorization code flow with PKCE: the verifier and state live in sessionStorage only until the redirect returns.
async function redirectToSignIn(): Promise<void> {
  const verifier = randomString()
  const state = randomString()
  sessionStorage.setItem(pendingSignInKey, JSON.stringify({ verifier, state }))
  const challenge = base64UrlEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.assign(`${cognitoDomain}/oauth2/authorize?${params}`)
}

async function requestTokens(grant: Record<string, string>): Promise<Tokens> {
  const response = await fetch(`${cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, ...grant }),
  })
  if (!response.ok) throw new Error(`Sign-in failed: ${await response.text()}`)
  const tokens: { access_token: string; refresh_token?: string; expires_in: number } = await response.json()
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? grant['refresh_token'] ?? '',
    expiresAt: Date.now() + tokens.expires_in * 1000,
  }
}

async function exchangeCode(params: URLSearchParams): Promise<Tokens> {
  const pending: { verifier: string; state: string } | null = JSON.parse(
    sessionStorage.getItem(pendingSignInKey) ?? 'null'
  )
  sessionStorage.removeItem(pendingSignInKey)
  if (!pending || params.get('state') !== pending.state) {
    throw new Error('This sign-in response does not belong to this browser tab. Please sign in again.')
  }
  return requestTokens({
    grant_type: 'authorization_code',
    code: params.get('code') ?? '',
    redirect_uri: redirectUri,
    code_verifier: pending.verifier,
  })
}

// Tokens are kept in memory only, never in localStorage: a reload signs in again through Cognito's session cookie.
export default function useAuth(enabled: boolean): Auth {
  const tokens = useRef<Tokens | null>(null)
  const started = useRef(false)
  const [status, setStatus] = useState<AuthStatus>(enabled ? 'signing-in' : 'disabled')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || started.current) return
    started.current = true

    const completeSignIn = async (): Promise<void> => {
      const params = new URLSearchParams(window.location.search)
      const signInError = params.get('error')
      if (signInError) throw new Error(params.get('error_description') ?? signInError)
      if (!params.has('code')) {
        await redirectToSignIn()
        return
      }
      tokens.current = await exchangeCode(params)
      window.history.replaceState({}, document.title, '/')
      setStatus('signed-in')
    }

    const run = async (): Promise<void> => {
      try {
        await completeSignIn()
      } catch (err) {
        window.history.replaceState({}, document.title, '/')
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      }
    }
    run()
  }, [enabled])

  const getAccessToken = async (): Promise<string | null> => {
    if (!tokens.current) {
      await redirectToSignIn()
      return null
    }
    if (tokens.current.expiresAt - 60_000 < Date.now()) {
      try {
        tokens.current = await requestTokens({
          grant_type: 'refresh_token',
          refresh_token: tokens.current.refreshToken,
        })
      } catch {
        await redirectToSignIn()
        return null
      }
    }
    return tokens.current.accessToken
  }

  const signIn = async (): Promise<void> => {
    setError(null)
    await redirectToSignIn()
  }

  const signOut = (): void => {
    tokens.current = null
    const params = new URLSearchParams({ client_id: clientId, logout_uri: window.location.origin })
    window.location.assign(`${cognitoDomain}/logout?${params}`)
  }

  return { status, error, getAccessToken, signIn, signOut }
}
