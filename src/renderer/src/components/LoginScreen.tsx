import React, { useState, useEffect } from 'react'
import { electron } from '../utils/electron'
import { Logo } from './Logo'
import { useTranslation } from 'react-i18next'

export function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const { t } = useTranslation()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isRegister) {
        const result = await electron.ipcRenderer.invoke('auth:register', { email, password, username })
        if (result && result.token) {
          window.localStorage.setItem('playhub_session', result.token)
        }
        onLogin(result.user)
      } else {
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
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 w-96 shadow-2xl">
        <div className="flex justify-center mb-6">
            <Logo className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isRegister ? t('login.createAccount') : t('login.welcomeBack')}
        </h2>
        
        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-slate-400 text-sm mb-1">{t('login.usernameLabel')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-slate-400 text-sm mb-1">{t('login.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">{t('login.passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors"
          >
            {isRegister ? t('login.signUp') : t('login.logIn')}
          </button>
        </form>
        
        <p className="mt-4 text-center text-slate-400 text-sm">
          {isRegister ? t('login.alreadyHaveAccount') : t('login.dontHaveAccount')}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-400 hover:underline"
          >
            {isRegister ? t('login.logIn') : t('login.signUp')}
          </button>
        </p>
      </div>
    </div>
  )
}
