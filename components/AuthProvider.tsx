'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean // Navbar'ın beklediği isim 'loading' olarak güncellendi
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    const syncAuthCookies = (currentSession: Session | null) => {
        if (typeof document === "undefined") return

        if (currentSession?.access_token) {
            document.cookie = `sb-access-token=${currentSession.access_token}; path=/; max-age=${currentSession.expires_in ?? 3600}; samesite=lax`
            return
        }

        document.cookie = "sb-access-token=; path=/; max-age=0; samesite=lax"
    }

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setUser(session?.user ?? null)
            syncAuthCookies(session)
            setLoading(false)
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
                syncAuthCookies(session)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    )
}
