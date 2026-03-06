import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

interface AuthPageProps {
  onAuthenticated: () => void
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) onAuthenticated()
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onAuthenticated()
    })

    return () => subscription.unsubscribe()
  }, [onAuthenticated])

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      console.error('Auth error:', error)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background grain relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">Powered by Gemini AI</span>
          </div>
          <h1 className="font-display text-5xl font-bold mb-3 tracking-tight">
            <span className="text-foreground">AI Interview</span>
            <br />
            <span className="text-gradient-cyan">Assistant</span>
          </h1>
          <p className="text-muted-foreground text-sm">Sign in to start your interview experience</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-xl">Welcome</CardTitle>
            <CardDescription>Continue with your Google account</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 gap-3 bg-foreground text-background hover:bg-foreground/90 font-semibold text-base"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? 'Redirecting...' : 'Continue with Google'}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Secure authentication via Supabase
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
