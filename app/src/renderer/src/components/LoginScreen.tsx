import React, { useState } from 'react'
import { electron } from '../utils/electron'
import { Logo } from './Logo'
import { useTranslation } from 'react-i18next'

type AuthMode = 'login' | 'register' | 'forgot_email' | 'forgot_code' | 'forgot_password'

export function LoginScreen({ onLogin }: { onLogin: (user: any, notification?: { title: string; body: string }, isNewUser?: boolean) => void }) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Reset relevant state when switching views
  const switchView = (mode: AuthMode) => {
    setViewMode(mode)
    setError('')
    setSuccess('')
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (viewMode === 'forgot_email') {
        setIsLoading(true)
        try {
            await electron.ipcRenderer.invoke('auth:initiate-reset', { email })
            switchView('forgot_code')
        } catch (err: any) {
            setError(err.message || t('login.authFailed'))
        } finally {
            setIsLoading(false)
        }
        return
    }

    if (viewMode === 'forgot_code') {
        setIsLoading(true)
        try {
            await electron.ipcRenderer.invoke('auth:verify-reset-code', { email, code: resetCode })
            switchView('forgot_password')
        } catch (err: any) {
            setError(err.message || t('login.authFailed'))
        } finally {
            setIsLoading(false)
        }
        return
    }

    if (viewMode === 'forgot_password') {
        setIsLoading(true)
        try {
            await electron.ipcRenderer.invoke('auth:complete-reset', { email, code: resetCode, newPassword })
            switchView('login')
            setSuccess(t('login.passwordResetSuccess'))
            setPassword('') // clear password field for login
            setResetCode('')
            setNewPassword('')
        } catch (err: any) {
            setError(err.message || t('login.authFailed'))
        } finally {
            setIsLoading(false)
        }
        return
    }

    // Login or Register
    try {
      if (viewMode === 'register') {
        const result = await electron.ipcRenderer.invoke('auth:register', { email, password, username })
        if (result && result.token) {
          window.localStorage.setItem('playhub_session', result.token)
        }
        
        // Check if username was changed
        let notification
        if (result.user.username !== username) {
          notification = {
            title: t('login.usernameChangedTitle'),
            body: t('login.usernameChangedBody', { old: username, new: result.user.username })
          }
        }
        
        onLogin(result.user, notification, true)
      } else {
        // Login
        const result = await electron.ipcRenderer.invoke('auth:login', { email, password })
        if (result && result.token) {
          window.localStorage.setItem('playhub_session', result.token)
        }
        onLogin(result.user)
      }
    } catch (err: any) {
      setError(err.message || t('login.authFailed'))
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className="bg-slate-900/90 backdrop-blur-sm p-8 rounded-xl border border-slate-800 w-96 shadow-2xl">
        <div className="flex justify-center mb-6">
            <Logo className="h-16 w-auto" />
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {viewMode === 'register' && t('login.createAccount')}
          {viewMode === 'login' && t('login.welcomeBack')}
          {viewMode === 'forgot_email' && t('login.forgotPasswordTitle')}
          {viewMode === 'forgot_code' && t('login.verifyTitle')}
          {viewMode === 'forgot_password' && t('login.newPasswordTitle')}
        </h2>

        {(viewMode === 'forgot_email' || viewMode === 'forgot_code' || viewMode === 'forgot_password') && (
             <p className="text-slate-400 text-sm text-center mb-6">
                {viewMode === 'forgot_email' && t('login.forgotPasswordDesc')}
                {viewMode === 'forgot_code' && t('login.verifyDesc', { email })}
                {viewMode === 'forgot_password' && t('login.newPasswordDesc')}
             </p>
        )}

        {/* Spacing for login/register where no desc exists */}
        {(viewMode === 'login' || viewMode === 'register') && <div className="mb-6"></div>}
        
        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center animate-in fade-in slide-in-from-top-1">
                {error}
            </div>
        )}

        {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded mb-4 text-sm text-center animate-in fade-in slide-in-from-top-1">
                {success}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Field (Register only) */}
          {viewMode === 'register' && (
            <div>
              <label className="block text-slate-400 text-sm mb-1">{t('login.usernameLabel')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
          )}

          {/* Email Field (Login, Register, Forgot Email) */}
          {(viewMode === 'login' || viewMode === 'register' || viewMode === 'forgot_email') && (
            <div>
                <label className="block text-slate-400 text-sm mb-1">{t('login.emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                  autoFocus={viewMode === 'forgot_email'}
                />
            </div>
          )}

          {/* Code Field (Forgot Code) */}
          {viewMode === 'forgot_code' && (
            <div>
                <label className="block text-slate-400 text-sm mb-1">{t('settings.account.enterCode')}</label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-center text-xl tracking-widest text-white focus:outline-none focus:border-primary-500 font-mono"
                  placeholder="000000"
                  required
                  autoFocus
                />
            </div>
          )}

          {/* Password Field (Login, Register) */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <div>
                <label className="block text-slate-400 text-sm mb-1">{t('login.passwordLabel')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                />
                 {viewMode === 'login' && (
                    <div className="flex justify-end mt-1">
                        <button
                            type="button"
                            onClick={() => switchView('forgot_email')}
                            className="text-xs text-primary-400 hover:text-primary-300 hover:underline"
                        >
                            {t('login.forgotPassword')}
                        </button>
                    </div>
                )}
            </div>
          )}

          {/* New Password Field (Forgot Password) */}
          {viewMode === 'forgot_password' && (
             <div>
                <label className="block text-slate-400 text-sm mb-1">{t('login.newPasswordTitle')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                  autoFocus
                />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />}
            {viewMode === 'register' && t('login.signUp')}
            {viewMode === 'login' && t('login.logIn')}
            {viewMode === 'forgot_email' && (isLoading ? t('login.sending') : t('login.sendCode'))}
            {viewMode === 'forgot_code' && (isLoading ? t('login.verifying') : t('login.verify'))}
            {viewMode === 'forgot_password' && (isLoading ? t('login.resetting') : t('login.resetPassword'))}
          </button>
        </form>
        
        {/* Footer Links */}
        <div className="mt-4 text-center text-slate-400 text-sm">
          {viewMode === 'login' && (
             <>
               {t('login.dontHaveAccount')}{' '}
               <button onClick={() => switchView('register')} className="text-primary-400 hover:underline">
                 {t('login.signUp')}
               </button>
             </>
          )}

          {viewMode === 'register' && (
             <>
               {t('login.alreadyHaveAccount')}{' '}
               <button onClick={() => switchView('login')} className="text-primary-400 hover:underline">
                 {t('login.logIn')}
               </button>
             </>
          )}

          {(viewMode === 'forgot_email' || viewMode === 'forgot_code' || viewMode === 'forgot_password') && (
              <button onClick={() => switchView('login')} className="text-slate-500 hover:text-slate-300 hover:underline">
                  {t('login.backToLogin')}
              </button>
          )}
        </div>
      </div>
    </div>
  )
}
