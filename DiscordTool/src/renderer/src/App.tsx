import { useState, useEffect } from 'react'
import clsx from 'clsx'

interface EmbedField {
  name: string
  value: string
  inline: boolean
}

interface Embed {
  title: string
  description: string
  url: string
  color: string // hex
  timestamp: string // ISO
  footer: { text: string; icon_url: string }
  thumbnail: { url: string }
  image: { url: string }
  author: { name: string; url: string; icon_url: string }
  fields: EmbedField[]
}

function App() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [content, setContent] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  const [embed, setEmbed] = useState<Embed>({
    title: '',
    description: '',
    url: '',
    color: '#5865F2',
    timestamp: '',
    footer: { text: '', icon_url: '' },
    thumbnail: { url: '' },
    image: { url: '' },
    author: { name: '', url: '', icon_url: '' },
    fields: []
  })

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    const savedUrl = localStorage.getItem('discord_webhook_url')
    if (savedUrl) setWebhookUrl(savedUrl)
  }, [])

  const handleSend = async () => {
    if (!webhookUrl) {
      setErrorMessage('Webhook URL is required')
      return
    }

    localStorage.setItem('discord_webhook_url', webhookUrl)
    setStatus('sending')
    setErrorMessage('')

    // Filter empty fields to keep payload clean
    const payloadEmbed: any = {}
    if (embed.title) payloadEmbed.title = embed.title
    if (embed.description) payloadEmbed.description = embed.description
    if (embed.url) payloadEmbed.url = embed.url
    if (embed.color) payloadEmbed.color = parseInt(embed.color.replace('#', ''), 16)
    if (embed.timestamp) payloadEmbed.timestamp = embed.timestamp
    if (embed.footer.text) payloadEmbed.footer = embed.footer
    if (embed.thumbnail.url) payloadEmbed.thumbnail = embed.thumbnail
    if (embed.image.url) payloadEmbed.image = embed.image
    if (embed.author.name) payloadEmbed.author = embed.author
    if (embed.fields.length > 0) payloadEmbed.fields = embed.fields

    const payload: any = {
      embeds: Object.keys(payloadEmbed).length > 0 ? [payloadEmbed] : []
    }
    
    if (content) payload.content = content
    if (username) payload.username = username
    if (avatarUrl) payload.avatar_url = avatarUrl

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('discord:send-webhook', {
        url: webhookUrl,
        payload
      })

      if (result.success) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMessage(result.error)
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  const addField = () => {
    setEmbed(prev => ({
      ...prev,
      fields: [...prev.fields, { name: '', value: '', inline: false }]
    }))
  }

  const removeField = (index: number) => {
    setEmbed(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }))
  }

  const updateField = (index: number, key: keyof EmbedField, value: any) => {
    setEmbed(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, [key]: value } : f)
    }))
  }

  const loadTemplate = (templateName: string) => {
    if (templateName === 'alpha-launch') {
      const now = new Date()
      const dateString = now.toLocaleDateString('en-GB') // DD/MM/YYYY
      setEmbed({
        title: '🚀 PlayHub Alpha Launch',
        description: "**We are excited to announce the first alpha release of PlayHub!**\n\nPlayHub is your new all-in-one game launcher, designed to unify your libraries and connect you with friends like never before.\n\n*Note: This is an alpha release, so you might encounter some bugs. Your feedback is highly appreciated!*",
        url: 'https://playhub-app.com',
        color: '#5865F2',
        timestamp: now.toISOString(),
        footer: { text: `PlayHub Team • ${dateString}`, icon_url: '' },
        thumbnail: { url: 'https://placehold.co/200x200/5865F2/ffffff?text=PH' },
        image: { url: 'https://placehold.co/1200x630/5865F2/ffffff/png?text=PlayHub+Alpha+Launch&font=roboto' },
        author: { name: 'PlayHub Announcement', url: '', icon_url: '' },
        fields: [
          { name: '📥 Download Alpha', value: '[Download for Windows](https://playhub-app.com/download)', inline: true },
          { name: '🐛 Report Bugs', value: '[GitHub Issues](https://github.com/your-repo/issues)', inline: true },
          { name: '✨ Key Features', value: '• Unified Game Library\n• Cross-Platform Friend Sync\n• Modern & Fast UI\n• Privacy Focused', inline: false }
        ]
      })
      setContent('@everyone Big news! The wait is over.')
      setUsername('PlayHub Bot')
      setAvatarUrl('https://placehold.co/200x200/5865F2/ffffff?text=Bot')
      setShowTemplates(false)
    }
  }

  const inputClass = "w-full bg-[#11141d] border border-[#2b3245] rounded px-3 py-2 text-sm focus:border-[#5865F2] focus:outline-none transition-colors text-white placeholder-slate-500"
  const labelClass = "block text-xs font-medium text-[#949ba4]"
  const sectionHeaderClass = "text-xs font-bold uppercase text-[#949ba4] tracking-wider mb-2"

  return (
    <div className="flex flex-col h-screen bg-[#090b10] text-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-6 border-b border-[#1e2330] flex justify-between items-center bg-[#090b10]">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
               <path d="M20.317 4.369A18.16 18.16 0 0 0 16.558 3a12.5 12.5 0 0 0-.6 1.237 16.63 16.63 0 0 0-3.918 0A12.5 12.5 0 0 0 11.44 3a18.23 18.23 0 0 0-3.76 1.376C4.18 9.123 3.38 13.707 3.73 18.237A18.52 18.52 0 0 0 8.06 20a12.9 12.9 0 0 0 1.04-1.687 11.68 11.68 0 0 1-1.65-.8c.14-.1.278-.205.41-.313 3.176 1.488 6.61 1.488 9.75 0 .134.108.272.213.41.313-.53.32-1.087.59-1.668.8A12.9 12.9 0 0 0 15.94 20a18.46 18.46 0 0 0 4.33-1.763c.355-4.27-.61-8.82-3.953-13.868ZM9.68 14.61c-.9 0-1.64-.82-1.64-1.828s.72-1.828 1.64-1.828c.92 0 1.66.824 1.64 1.828 0 1.008-.72 1.828-1.64 1.828Zm4.64 0c-.9 0-1.64-.82-1.64-1.828s.72-1.828 1.64-1.828c.92 0 1.66.824 1.64 1.828 0 1.008-.72 1.828-1.64 1.828Z" />
            </svg>
            Discord Embed Builder
          </h1>
          <p className="text-sm text-slate-400">Create and send rich embed messages to Discord webhooks.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative">
             <button
               onClick={() => setShowTemplates(!showTemplates)}
               className="px-4 py-2 rounded font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
             >
               Load Template
             </button>
             {showTemplates && (
               <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded shadow-xl z-50">
                 <button
                   onClick={() => loadTemplate('alpha-launch')}
                   className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm text-white transition-colors first:rounded-t last:rounded-b"
                 >
                   🚀 Alpha Launch
                 </button>
               </div>
             )}
           </div>
           <button
             onClick={handleSend}
             disabled={status === 'sending' || !webhookUrl}
             className={clsx(
               "px-4 py-2 rounded font-medium transition-colors flex items-center gap-2",
               status === 'success' ? "bg-green-600 text-white" : "bg-[#5865F2] hover:bg-[#4752c4] text-white disabled:opacity-50 disabled:cursor-not-allowed"
             )}
           >
             {status === 'sending' ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : status === 'success' ? (
                <>Sent!</>
             ) : (
                <>Send Message</>
             )}
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Editor Column */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar border-r border-[#1e2330]">
          
          {/* Webhook Config */}
          <div className="space-y-4">
             {/* Removed 'Configuration' header based on screenshot, but kept spacing */}
             <div className="space-y-2">
               <label className={labelClass}>Webhook URL</label>
               <input
                 type="password"
                 value={webhookUrl}
                 onChange={(e) => setWebhookUrl(e.target.value)}
                 placeholder="https://discord.com/api/webhooks/..."
                 className={inputClass}
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className={labelClass}>Username Override</label>
                 <input
                   type="text"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   placeholder="Bot Name"
                   className={inputClass}
                 />
               </div>
               <div className="space-y-2">
                 <label className={labelClass}>Avatar URL Override</label>
                 <input
                   type="text"
                   value={avatarUrl}
                   onChange={(e) => setAvatarUrl(e.target.value)}
                   placeholder="https://..."
                   className={inputClass}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <label className={labelClass}>Message Content</label>
               <textarea
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 placeholder="Message text outside the embed..."
                 className={`${inputClass} h-24 resize-y`}
               />
             </div>
          </div>

          <hr className="border-[#1e2330]" />

          {/* Embed Config */}
          <div className="space-y-4">
             <h3 className={sectionHeaderClass}>Embed Details</h3>
             
             <div className="grid grid-cols-[1fr_auto] gap-4">
               <div className="space-y-2">
                 <label className={labelClass}>Author Name</label>
                 <input
                   type="text"
                   value={embed.author.name}
                   onChange={(e) => setEmbed({...embed, author: {...embed.author, name: e.target.value}})}
                   className={inputClass}
                 />
               </div>
               <div className="space-y-2">
                 <label className={labelClass}>Color</label>
                 <div className="flex items-center gap-2">
                   <input
                     type="color"
                     value={embed.color}
                     onChange={(e) => setEmbed({...embed, color: e.target.value})}
                     className="h-[38px] w-14 bg-[#11141d] border border-[#2b3245] rounded cursor-pointer p-0.5"
                   />
                 </div>
               </div>
             </div>
             
             <div className="space-y-2">
               <label className={labelClass}>Title</label>
               <input
                 type="text"
                 value={embed.title}
                 onChange={(e) => setEmbed({...embed, title: e.target.value})}
                 className={inputClass}
               />
             </div>

             <div className="space-y-2">
               <label className={labelClass}>Description</label>
               <textarea
                 value={embed.description}
                 onChange={(e) => setEmbed({...embed, description: e.target.value})}
                 className={`${inputClass} h-32 resize-y`}
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className={labelClass}>Thumbnail URL</label>
                    <input
                        type="text"
                        value={embed.thumbnail.url}
                        onChange={(e) => setEmbed({...embed, thumbnail: {...embed.thumbnail, url: e.target.value}})}
                        className={inputClass}
                    />
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>Image URL</label>
                    <input
                        type="text"
                        value={embed.image.url}
                        onChange={(e) => setEmbed({...embed, image: {...embed.image, url: e.target.value}})}
                        className={inputClass}
                    />
                </div>
             </div>

             <div className="space-y-2">
                <label className={labelClass}>Footer Text</label>
                <input
                    type="text"
                    value={embed.footer.text}
                    onChange={(e) => setEmbed({...embed, footer: {...embed.footer, text: e.target.value}})}
                    className={inputClass}
                />
             </div>
          </div>

          <hr className="border-[#1e2330]" />

          {/* Fields Config */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className={sectionHeaderClass}>Fields</h3>
                <button 
                  onClick={addField}
                  className="text-xs text-[#5865F2] hover:text-[#4752c4] font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Field
                </button>
             </div>
             
             {embed.fields.map((field, index) => (
               <div key={index} className="bg-[#11141d] p-4 rounded border border-[#2b3245] relative group">
                  <button 
                    onClick={() => removeField(index)}
                    className="absolute top-2 right-2 text-[#949ba4] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[#949ba4]">Name</label>
                        <input
                            type="text"
                            placeholder="Field Name"
                            value={field.name}
                            onChange={(e) => updateField(index, 'name', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[#949ba4]">Value</label>
                        <textarea
                            placeholder="Field Value"
                            value={field.value}
                            onChange={(e) => updateField(index, 'value', e.target.value)}
                            className={`${inputClass} h-20 resize-y`}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#949ba4] select-none cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={field.inline}
                        onChange={(e) => updateField(index, 'inline', e.target.checked)}
                        className="rounded bg-[#090b10] border-[#2b3245] text-[#5865F2] focus:ring-0 focus:ring-offset-0 w-4 h-4"
                      />
                      Inline Field
                    </label>
                  </div>
               </div>
             ))}
          </div>

        </div>

        {/* Preview Column */}
        <div className="flex-1 bg-[#313338] p-8 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Preview</h3>
          
          <div className="flex items-start gap-4 max-w-2xl">
             <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
                {avatarUrl ? (
                   <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-[#5865F2]">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369A18.16 18.16 0 0 0 16.558 3a12.5 12.5 0 0 0-.6 1.237 16.63 16.63 0 0 0-3.918 0A12.5 12.5 0 0 0 11.44 3a18.23 18.23 0 0 0-3.76 1.376C4.18 9.123 3.38 13.707 3.73 18.237A18.52 18.52 0 0 0 8.06 20a12.9 12.9 0 0 0 1.04-1.687 11.68 11.68 0 0 1-1.65-.8c.14-.1.278-.205.41-.313 3.176 1.488 6.61 1.488 9.75 0 .134.108.272.213.41.313-.53.32-1.087.59-1.668.8A12.9 12.9 0 0 0 15.94 20a18.46 18.46 0 0 0 4.33-1.763c.355-4.27-.61-8.82-3.953-13.868ZM9.68 14.61c-.9 0-1.64-.82-1.64-1.828s.72-1.828 1.64-1.828c.92 0 1.66.824 1.64 1.828 0 1.008-.72 1.828-1.64 1.828Zm4.64 0c-.9 0-1.64-.82-1.64-1.828s.72-1.828 1.64-1.828c.92 0 1.66.824 1.64 1.828 0 1.008-.72 1.828-1.64 1.828Z" /></svg>
                   </div>
                )}
             </div>
             
             <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                   <span className="font-medium text-white">{username || 'Bot'}</span>
                   <span className="text-[10px] bg-[#5865F2] text-white px-1 rounded-[3px]">BOT</span>
                   <span className="text-xs text-slate-400 ml-1">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                {content && (
                  <div className="text-slate-100 whitespace-pre-wrap mt-1 mb-2">{content}</div>
                )}

                {(embed.title || embed.description || embed.fields.length > 0 || embed.image.url || embed.author.name) && (
                  <div 
                    className="bg-[#2B2D31] rounded border-l-4 grid p-4 gap-4 max-w-full relative"
                    style={{ borderLeftColor: embed.color }}
                  >
                     <div className="grid gap-2">
                        {embed.author.name && (
                           <div className="flex items-center gap-2">
                              {embed.author.icon_url && <img src={embed.author.icon_url} className="w-6 h-6 rounded-full" />}
                              <span className="font-bold text-sm text-white">{embed.author.name}</span>
                           </div>
                        )}
                        
                        {embed.title && (
                           <div className="font-bold text-base text-blue-400">{embed.title}</div>
                        )}
                        
                        {embed.description && (
                           <div className="text-sm text-slate-300 whitespace-pre-wrap">{embed.description}</div>
                        )}
                        
                        {embed.fields.length > 0 && (
                           <div className="grid grid-cols-12 gap-2 mt-1">
                              {embed.fields.map((field, i) => (
                                 <div key={i} className={clsx(field.inline ? "col-span-4" : "col-span-12")}>
                                    <div className="text-xs font-bold text-slate-400 mb-1">{field.name}</div>
                                    <div className="text-sm text-slate-300 whitespace-pre-wrap">{field.value}</div>
                                 </div>
                              ))}
                           </div>
                        )}

                        {embed.image.url && (
                           <img src={embed.image.url} className="rounded max-w-full max-h-[300px] mt-2 object-cover" />
                        )}

                        {(embed.footer.text || embed.timestamp) && (
                           <div className="flex items-center gap-2 mt-2 pt-2 text-xs text-slate-500">
                              {embed.footer.text && embed.footer.icon_url && <img src={embed.footer.icon_url} className="w-5 h-5 rounded-full" />}
                              <span>
                                 {embed.footer.text}
                                 {embed.footer.text && embed.timestamp && ' • '}
                                 {embed.timestamp && new Date(embed.timestamp).toLocaleString()}
                              </span>
                           </div>
                        )}
                     </div>
                     
                     {embed.thumbnail.url && (
                        <div className="absolute top-4 right-4 w-20 h-20">
                            <img src={embed.thumbnail.url} className="w-full h-full object-cover rounded" />
                        </div>
                     )}
                  </div>
                )}
             </div>
          </div>
          
          {status === 'error' && (
             <div className="mt-8 p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                Error: {errorMessage}
             </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
