import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Download, Check, Send, Globe, Mic, X, Ghost, Sun, Moon, Sparkles, PanelLeftClose, PanelLeftOpen, Volume2, ImageIcon, UserRound, LogIn, Copy, Trash2, Edit2 } from 'lucide-react';
import NinaAvatar from './NinaAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import ProfileModal from './ProfileModal';
import { GoogleLogin } from '@react-oauth/google';

const MODELS = [
  { id: 'nova', name: 'Nova', version: '1.1', description: 'Fastest' },
  { id: 'atlas', name: 'Atlas', version: '1.1', description: 'For daily tasks' },
  { id: 'helix', name: 'Helix', version: '1.1', description: 'For complex tasks' },
  { id: 'prism', name: 'Prism', version: '1.2', description: 'Image generation' },
];

const getSessionId = () => {
    let id = sessionStorage.getItem('kyza_session_id');
    if (!id) {
        id = 'anon-' + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('kyza_session_id', id);
    }
    return id;
};

const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
    return parts.map((part, index) => {
        if (part.startsWith('```')) {
            const match = part.match(/```([\w]*)\n([\s\S]*?)```/);
            if (match) {
                const language = match[1] || 'text';
                const code = match[2];
                return (
                    <div key={index} style={{ margin: '16px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--hairline-strong)', background: 'var(--surface-card)', color: 'var(--ink)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-soft)', borderBottom: '1px solid var(--hairline-strong)', fontSize: '12px' }}>
                            <span style={{ textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-sub)' }}>{language}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(code.trim())}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    className="hover-text"
                                    title="Copy Code"
                                >
                                    <Copy size={14} />
                                    Copy
                                </button>
                                <button 
                                    onClick={() => {
                                        const blob = new Blob([code.trim()], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `code.${language || 'txt'}`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    className="hover-text"
                                    title="Download Code"
                                >
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '12px', overflowX: 'auto', whiteSpace: 'pre', fontSize: '13px', fontFamily: 'monospace' }}>
                            {code.trim()}
                        </div>
                    </div>
                );
            }
        }
        return <span key={index}>{part}</span>;
    });
};

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState(getSessionId());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isIncognito, setIsIncognito] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('kyza-theme') || 'light');
  
  // Multimodal State
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<{type: string, content: string} | null>(null);
  
  // Dropdowns
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  // States for buttons
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auth & Free Tier State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Mobile Responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewChat = () => {
      const newId = 'anon-' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('kyza_session_id', newId);
      setCurrentSessionId(newId);
      setMessages([]);
      setActiveArtifact(null);
      if (isMobile) setIsSidebarOpen(false);
  };

  const saveChatTitle = (sessionId: string, newTitle: string) => {
      if (!newTitle.trim()) {
          setEditingChatId(null);
          return;
      }
      const storedTitles = JSON.parse(localStorage.getItem('kyza_titles') || '{}');
      storedTitles[sessionId] = newTitle.trim();
      localStorage.setItem('kyza_titles', JSON.stringify(storedTitles));
      setChatHistory(prev => prev.map(chat => chat.sessionId === sessionId ? { ...chat, title: newTitle.trim() } : chat));
      setEditingChatId(null);
  };

  const confirmDeleteChat = async () => {
      if (!chatToDelete) return;
      const sessionId = chatToDelete;
      
      setChatHistory(prev => prev.filter(c => c.sessionId !== sessionId));
      if (currentSessionId === sessionId) {
          handleNewChat();
      }
      const deletedSessions = JSON.parse(localStorage.getItem('kyza_deleted_sessions') || '[]');
      if (!deletedSessions.includes(sessionId)) {
          deletedSessions.push(sessionId);
          localStorage.setItem('kyza_deleted_sessions', JSON.stringify(deletedSessions));
      }

      if (import.meta.env.VITE_SUPABASE_URL && user) {
          // Log it in the deleted_chats table so it's hidden across devices
          const { error } = await supabase.from('deleted_chats').insert([{
              session_id: sessionId,
              user_id: user.id
          }]);
          if (error) console.error("Supabase insert deleted_chat error:", error);
      }
      setChatToDelete(null);
  };

  useEffect(() => {
    const initAuth = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       setUser(session?.user ?? null);
       
       const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
             // Wait until session is ready
             const { error: updateError } = await supabase.from('chats').update({ user_id: newSession.user.id }).eq('session_id', currentSessionId).is('user_id', null);
             if (updateError) console.error("Supabase update error:", updateError);
             fetchChats(newSession.user);
             if (newSession.user && showAuthModal) setShowAuthModal(false);
          }
       });
       fetchChats(session?.user ?? null);
       
       return () => subscription.unsubscribe();
    };
    if (import.meta.env.VITE_SUPABASE_URL) initAuth();
  }, []);

  const fetchChats = async (currentUser: User | null) => {
    try {
      const localSessionId = currentSessionId;
      let query = supabase.from('chats').select('*').order('created_at', { ascending: true });
      if (currentUser) {
          query = query.eq('user_id', currentUser.id);
      } else {
          query = query.eq('session_id', localSessionId);
      }

      const { data, error } = await query;
      if (!error && data) {
         if (currentUser) {
             const history = data.reduce((acc: any, msg: any) => {
                 if (!acc[msg.session_id]) acc[msg.session_id] = [];
                 acc[msg.session_id].push(msg);
                 return acc;
             }, {});
             
             const storedTitles = JSON.parse(localStorage.getItem('kyza_titles') || '{}');
             let deletedSessions = JSON.parse(localStorage.getItem('kyza_deleted_sessions') || '[]');
             
             // Fetch remote deleted sessions to sync across devices
             const { data: remoteDeleted, error: delError } = await supabase.from('deleted_chats').select('session_id').eq('user_id', currentUser.id);
             if (!delError && remoteDeleted) {
                 const remoteSids = remoteDeleted.map((d: any) => d.session_id);
                 deletedSessions = Array.from(new Set([...deletedSessions, ...remoteSids]));
                 localStorage.setItem('kyza_deleted_sessions', JSON.stringify(deletedSessions));
             }
             
             const historyArray = Object.keys(history)
              .filter(sid => !deletedSessions.includes(sid))
              .map(sid => ({
                 sessionId: sid,
                 messages: history[sid],
                 title: storedTitles[sid] || history[sid][0]?.content?.substring(0, 30) + '...',
                 created_at: history[sid][0]?.created_at || new Date().toISOString()
             })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
             
             setChatHistory(historyArray);
             
             const currentChat = historyArray.find(h => h.sessionId === localSessionId);
             if (currentChat) {
                 setMessages(currentChat.messages.map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments || [] })));
             } else {
                 setMessages([]);
             }
         } else {
             setMessages(data.map((d: any) => ({ role: d.role, content: d.content, attachments: d.attachments || [] })));
         }
      }
    } catch (e) {
      console.error("Supabase fetch error:", e);
    }
  };
  
  // Re-fetch when currentSessionId changes
  useEffect(() => {
     if (currentSessionId) {
         sessionStorage.setItem('kyza_session_id', currentSessionId);
     }
     fetchChats(user);
  }, [currentSessionId, user]);

  const handleGoogleLogin = async (credentialResponse: any) => {
      if (credentialResponse.credential) {
          await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: credentialResponse.credential
          });
          setShowAuthModal(false);
      }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setMessages([]);
      setShowProfileModal(false);
  };

  const speakWithHorimiyaVoice = (text: string) => {
    // Chrome Web Speech API bug fix: cancel any stuck previous speech
    window.speechSynthesis.cancel();

    if (!text || text.trim() === '') return; // Don't speak if there's no text left (e.g. only code blocks)

    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 1.3; // Bright, anime girl pitch
    u.rate = 1.05; // Slightly faster, energetic
    
    const voices = window.speechSynthesis.getVoices();
    
    // Check if the text contains Urdu/Arabic characters
    const hasUrdu = /[\u0600-\u06FF]/.test(text);
    
    let voiceToUse;
    if (hasUrdu) {
        // Find the absolute best Urdu/Hindi voice available on the user's device
        voiceToUse = 
            voices.find(v => v.lang === 'ur-PK' && (v.name.includes('Female') || v.name.includes('Google'))) ||
            voices.find(v => v.lang.includes('ur') && (v.name.includes('Female') || v.name.includes('Google'))) ||
            voices.find(v => v.lang.includes('ur')) ||
            voices.find(v => v.lang.includes('hi') && (v.name.includes('Female') || v.name.includes('Google'))) ||
            voices.find(v => v.lang.includes('hi'));
            
        // Reset pitch/rate for natural Urdu (high pitch ruins the Desi TTS engines)
        u.pitch = 1.0; 
        u.rate = 1.0;
    }
    
    if (!voiceToUse) {
        // Fallback to female English voice
        voiceToUse = voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Google'))) || 
                     voices.find(v => v.name.includes('Female')) || 
                     voices.find(v => v.lang.includes('en'));
    }
    
    if (voiceToUse) {
        u.voice = voiceToUse;
    }
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kyza-theme', theme);
  }, [theme]);

  const autoSize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    
    if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
    
    const newMsg = { 
        role: 'user', 
        content: input.trim(),
        attachments: attachments
    };
    
    const currentMessages = [...messages, newMsg];
    setMessages(currentMessages);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
        if (import.meta.env.VITE_SUPABASE_URL) {
            const { error: insertError } = await supabase.from('chats').insert([{ 
                role: 'user', 
                content: newMsg.content, 
                attachments: newMsg.attachments,
                session_id: currentSessionId,
                user_id: user?.id || null
            }]);
            if (insertError) console.error("Supabase insert error (user msg):", insertError);
            
            // Instantly update sidebar for new chats without re-fetching everything
            setChatHistory(prev => {
                if (prev.find(h => h.sessionId === currentSessionId)) return prev;
                const storedTitles = JSON.parse(localStorage.getItem('kyza_titles') || '{}');
                return [{
                    sessionId: currentSessionId,
                    title: storedTitles[currentSessionId] || newMsg.content.substring(0, 30) + '...',
                    created_at: new Date().toISOString(),
                    messages: [newMsg]
                }, ...prev];
            });
        }
    } catch(e) { console.error(e) }
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel.id,
          isNinaMode: isLiveMode,
          messages: currentMessages.map(m => ({ role: m.role, content: m.content, attachments: m.attachments }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, attachments: data.attachments || [] }]);
      
      try {
          if (import.meta.env.VITE_SUPABASE_URL) {
             const { error: assistInsertError } = await supabase.from('chats').insert([{ 
                 role: 'assistant', 
                 content: data.content, 
                 attachments: data.attachments || [],
                 session_id: currentSessionId,
                 user_id: user?.id || null
             }]);
             if (assistInsertError) console.error("Supabase insert error (assistant msg):", assistInsertError);
             setChatHistory(prev => prev.map(h => h.sessionId === currentSessionId ? { ...h, messages: [...h.messages, {role: 'assistant', content: data.content, attachments: data.attachments || []}] } : h));

          }
      } catch(e) { console.error(e) }

      const extractBlock = (text: string, type: string) => {
         const regex = new RegExp(`\`\`\`${type}\\n([\\s\\S]*?)\`\`\``);
         const match = text.match(regex);
         return match ? match[1] : null;
      };

      const htmlContent = extractBlock(data.content, 'html') || extractBlock(data.content, 'svg') || extractBlock(data.content, 'react');
      const csvContent = extractBlock(data.content, 'csv');
      const mdContent = extractBlock(data.content, 'markdown') || extractBlock(data.content, 'md');

      if (htmlContent) {
         setActiveArtifact({ type: 'html', content: htmlContent });
      } else if (csvContent) {
         setActiveArtifact({ type: 'csv', content: csvContent });
      } else if (mdContent) {
         setActiveArtifact({ type: 'markdown', content: mdContent });
      }

      // Auto-speak if in Live Mode
      if (isLiveMode) {
          speakWithHorimiyaVoice(data.content.replace(/```[\s\S]*?```/g, '')); // Strip code blocks from speech
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with the backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files);
          const base64Files = await Promise.all(files.map(file => {
             return new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.readAsDataURL(file);
                 reader.onload = () => resolve(reader.result as string);
             });
          }));
          setAttachments(prev => [...prev, ...base64Files]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Voice Integration ---
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setTimeout(() => {
            const btn = document.getElementById('live-send-btn');
            if (btn) btn.click();
        }, 500);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="app-root">
      <div className="app-shell">
        
        <AnimatePresence>
          {isSidebarOpen && (
              <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }} 
                 onClick={() => setIsSidebarOpen(false)}
                 style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', zIndex: 99 }}
              />
          )}
        </AnimatePresence>
        
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
              <motion.aside 
                 initial={{ width: 0, opacity: 0 }}
                 animate={{ width: 280, opacity: 1 }}
                 exit={{ width: 0, opacity: 0 }}
                 className="sidebar"
                 style={{ 
                    borderRight: '1px solid var(--hairline-strong)', 
                    background: 'var(--surface-card)', 
                    display: 'flex', flexDirection: 'column',
                    position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 
                 }}
              >
                 <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--hairline-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <img src="/favicon.jpeg" alt="KYZA Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                       <div>
                           <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)' }}>KYZA</div>
                           <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>Your AI Assistant</div>
                       </div>
                    </div>
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button onClick={handleNewChat} style={{background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)'}} title="New Chat">
                           <Plus size={18}/>
                        </button>
                        <button onClick={() => setIsSidebarOpen(false)} style={{background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)'}} title="Close Sidebar">
                           <PanelLeftClose size={18}/>
                        </button>
                    </div>
                 </div>
                 
                 <div style={{padding: '12px', flex: 1, overflowY: 'auto'}}>
                    <div style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600}}>History</div>
                    {user ? (
                        chatHistory.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {chatHistory.map((chat) => (
                                    <div key={chat.sessionId} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        {editingChatId === chat.sessionId ? (
                                            <input 
                                                autoFocus
                                                value={editingTitle}
                                                onChange={e => setEditingTitle(e.target.value)}
                                                onBlur={() => saveChatTitle(chat.sessionId, editingTitle)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') saveChatTitle(chat.sessionId, editingTitle);
                                                    if (e.key === 'Escape') setEditingChatId(null);
                                                }}
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                                    background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px', outline: 'none'
                                                }}
                                            />
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setCurrentSessionId(chat.sessionId);
                                                    if (isMobile) setIsSidebarOpen(false);
                                                }}
                                                style={{ 
                                                    flex: 1, textAlign: 'left', background: chat.sessionId === currentSessionId ? 'var(--surface-soft)' : 'transparent', 
                                                    border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', 
                                                    color: chat.sessionId === currentSessionId ? 'var(--ink)' : 'var(--text-sub)',
                                                    fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    paddingRight: '60px'
                                                }}
                                                className="hover-bg"
                                            >
                                                {chat.title}
                                            </button>
                                        )}
                                        {editingChatId !== chat.sessionId && (
                                            <div style={{ position: 'absolute', right: '4px', display: 'flex', gap: '4px' }}>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingTitle(chat.title); setEditingChatId(chat.sessionId); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} className="hover-bg">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setChatToDelete(chat.sessionId); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} className="hover-bg">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{fontSize: '13px', color: 'var(--text-sub)', padding: '8px 4px'}}>No recent chats</div>
                        )
                    ) : (
                        <div style={{fontSize: '13px', color: 'var(--text-sub)', padding: '8px 4px'}}>Sign in to save history</div>
                    )}
                 </div>

                 {/* Profile / Settings Button at bottom of sidebar */}
                 <div style={{ padding: '12px', borderTop: '1px solid var(--hairline-strong)' }}>
                     <button 
                         onClick={() => user ? setShowProfileModal(true) : setShowAuthModal(true)}
                         className="hover-bg"
                         style={{ 
                             width: '100%', display: 'flex', alignItems: 'center', gap: '12px', 
                             padding: '12px', background: 'transparent', border: 'none', 
                             cursor: 'pointer', borderRadius: '8px', color: 'var(--ink)' 
                         }}
                     >
                         {user?.user_metadata?.avatar_url ? (
                             <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '16px', objectFit: 'cover' }} />
                         ) : (
                             <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 {user ? <UserRound size={18} /> : <LogIn size={18} />}
                             </div>
                         )}
                         <div style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                             <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                 {user ? (user.user_metadata?.full_name || 'My Account') : 'Sign In'}
                             </div>
                             {user && <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>Settings</div>}
                         </div>
                     </button>
                     
                     <div style={{ marginTop: '16px', textAlign: 'center' }}>
                         <a href="/privacy.html" target="_blank" style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }} className="hover-text">Privacy Policy & Terms</a>
                     </div>
                 </div>
              </motion.aside>
          )}
        </AnimatePresence>
        
        <div className="app-main">
          <div className="chat-page" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile && activeArtifact ? '50%' : '100%', position: 'relative' }}>
              
              <header className="chat-topbar">
              <div className="inner" style={{display: 'flex', alignItems: 'center', width: '100%'}}>
                 {!isSidebarOpen && (
                   <button onClick={() => setIsSidebarOpen(true)} className="menu" style={{marginRight: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)'}}>
                     <PanelLeftOpen size={20}/>
                   </button>
                 )}
                 <div className="chat-topbar-actions" style={{marginLeft: 'auto', display: 'flex', gap: '8px'}}>
                    <button 
                       onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                       className="chat-topbar-incognito" 
                       title={theme === 'light' ? "Dark Mode" : "Light Mode"} 
                       style={{background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)'}}
                    >
                       {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                    </button>
                    <button 
                       onClick={() => {
                           const newMode = !isIncognito;
                           setIsIncognito(newMode);
                           if (newMode) {
                              setMessages([]);
                              setActiveArtifact(null);
                           }
                       }}
                       className={`chat-topbar-incognito ${isIncognito ? 'active' : ''}`} 
                       title={isIncognito ? "Exit Temporary Chat" : "Enter Temporary Chat"} 
                       style={{background: 'transparent', border: 'none', cursor: 'pointer', color: isIncognito ? 'var(--primary)' : 'var(--text-sub)'}}
                    >
                       <Ghost size={22} />
                    </button>
                 </div>
              </div>
            </header>

            <div className="chat-scroll-area" style={{ display: messages.length === 0 ? 'none' : 'block', overflowY: 'auto', flex: 1 }}>
              <div className="chat-stream">
                    <div className="inner">
                       <AnimatePresence>
                         {messages.map((msg, i) => (
                            <motion.article 
                               key={i}
                               className={`message ${msg.role}`}
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}
                            >
                               <div className="content" style={{ margin: 0 }}>
                                  <div className="author" style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                                     {msg.role === 'assistant' ? 'Kyza' : 'You'}
                                  </div>
                                  <div className="text" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', lineHeight: '1.5' }}>
                                     {renderMessageContent(msg.content)}
                                  </div>

                                  {msg.attachments && msg.attachments.length > 0 && (
                                      <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap'}}>
                                         {msg.attachments.map((att: string, idx: number) => (
                                             <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                                                <img 
                                                   src={att} 
                                                   alt="attachment" 
                                                   style={{width: '200px', borderRadius: '8px', border: '1px solid var(--hairline-strong)', display: 'block', cursor: 'zoom-in'}} 
                                                   onClick={() => setPreviewImage(att)}
                                                />
                                                <button 
                                                   onClick={(e) => {
                                                       e.stopPropagation();
                                                      const a = document.createElement('a');
                                                      a.href = att;
                                                      a.download = `kyza-image-${idx}.png`;
                                                      a.click();
                                                  }}
                                                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                                                  title="Download Image"
                                               >
                                                  <Download size={14} />
                                               </button>
                                            </div>
                                         ))}
                                      </div>
                                  )}
                                  
                                  {msg.role === 'assistant' && (
                                     <div style={{ marginTop: '12px' }}>
                                         <button 
                                            onClick={() => {
                                               speakWithHorimiyaVoice(msg.content);
                                            }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-sub)' }}
                                           className="hover-bg"
                                        >
                                           <Volume2 size={14}/> Read aloud
                                        </button>
                                     </div>
                                  )}
                               </div>
                            </motion.article>
                         ))}
                         {isLoading && (
                            <motion.article className="message assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                               <div className="content">
                                  <div className="author">Kyza</div>
                                  <div className="text">Thinking...</div>
                               </div>
                            </motion.article>
                         )}
                       </AnimatePresence>
                    </div>
              </div>
            </div>

            <div 
               className="composer-wrap"
               style={messages.length === 0 ? {
                   position: 'absolute',
                   top: '40%',
                   left: '50%',
                   transform: 'translate(-50%, -50%)',
                   width: '100%',
                   maxWidth: '800px',
                   padding: '0 20px',
               } : {
                   width: '100%',
                   padding: '20px'
               }}
            >
              {messages.length === 0 && (
                 <motion.h1 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center', fontSize: '28px', fontWeight: 600, color: 'var(--ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
                 >
                     {isIncognito ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <Sparkles size={28} color="var(--primary)" />
                           <span>
                              {"Temporary chat mode".split("").map((char, index) => (
                                 <motion.span
                                    key={index}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.05, delay: index * 0.05 }}
                                 >
                                    {char}
                                 </motion.span>
                              ))}
                           </span>
                        </div>
                     ) : "What can Kyza help you with?"}
                 </motion.h1>
              )}
              <form className="composer" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                 <input 
                    type="file" 
                    multiple
                    ref={fileInputRef} 
                    style={{display: 'none'}} 
                    onChange={handleFileChange}
                 />

                 <div className="composer-box glass">
                    <textarea 
                       ref={textareaRef}
                       rows={1}
                       placeholder="How can Kyza help you today?"
                       value={input}
                       onChange={(e) => { setInput(e.target.value); autoSize(e.target); }}
                       onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSend();
                          }
                       }}
                       disabled={isRecording}
                    />
                    <div className="composer-toolbar">
                        <div className="composer-toolbar-left">
                           <button type="button" className="composer-attach" title="Attach file" onClick={() => fileInputRef.current?.click()}>
                              <Plus size={16}/>
                           </button>
                           <button 
                              type="button" 
                              className={`composer-tools-btn ${webSearchEnabled ? 'active' : ''}`} 
                              title="Web Search" 
                              onClick={() => { 
                                 const nextState = !webSearchEnabled;
                                 setWebSearchEnabled(nextState); 
                                 if (nextState) {
                                     setSelectedModel(MODELS.find(m => m.id === 'atlas') || MODELS[0]); 
                                     setImageGenEnabled(false);
                                 }
                              }}
                           >
                              <Globe size={18} color={webSearchEnabled ? 'var(--primary)' : 'currentColor'} />
                           </button>
                           <button 
                              type="button" 
                              className={`composer-tools-btn ${imageGenEnabled ? 'active' : ''}`} 
                              title="Image Generation" 
                              onClick={() => { 
                                 const nextState = !imageGenEnabled;
                                 setImageGenEnabled(nextState); 
                                 if (nextState) {
                                     setSelectedModel(MODELS.find(m => m.id === 'prism') || MODELS[0]);
                                     setWebSearchEnabled(false);
                                 }
                              }}
                           >
                              <ImageIcon size={18} color={imageGenEnabled ? 'var(--primary)' : 'currentColor'} />
                           </button>
                        </div>
                        
                        <div className="composer-toolbar-actions">
                           <div className="model-badge-wrap" style={{position: 'relative'}}>
                              <button type="button" className="model-badge model-badge-button" style={{background: 'var(--surface-soft)', padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--hairline-strong)', gap: '6px'}} onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}>
                                 <span className="model-label" style={{fontSize: '13px', fontWeight: 500, color: 'var(--ink)'}}>{selectedModel.name} <span style={{opacity: 0.6}}>{selectedModel.version}</span></span>
                                 <span className="caret"><ChevronDown size={14}/></span>
                              </button>
                              {isModelDropdownOpen && (
                                 <div className="model-dropdown open" style={{position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, width: '240px', zIndex: 100}}>
                                    {MODELS.map(m => (
                                       <button key={m.id} type="button" className={`model-dropdown-item ${selectedModel.id === m.id ? 'active' : ''}`} onClick={() => { setSelectedModel(m); setIsModelDropdownOpen(false); }}>
                                          <span className="menu-text">
                                             <span className="menu-title">{m.name} <span style={{opacity: 0.6}}>{m.version}</span></span>
                                             <span className="menu-sub">{m.description}</span>
                                          </span>
                                          {selectedModel.id === m.id && <span className="menu-check"><Check size={16}/></span>}
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                           <button type="button" className={`model-badge-button hover-bg ${isLiveMode ? 'active' : ''}`} style={{background: isLiveMode ? 'var(--primary)' : 'var(--surface-soft)', color: isLiveMode ? '#fff' : 'var(--ink)', padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px'}} onClick={() => setIsLiveMode(!isLiveMode)} title="Talk with Nina">
                              <UserRound size={16} /> <span style={{fontSize: '13px', fontWeight: 600}}>Nina</span>
                           </button>
                          {input.trim() || attachments.length > 0 ? (
                             <button type="submit" className="send"><Send size={16}/></button>
                          ) : (
                             <button 
                                type="button" 
                                className={`voice-assistant-btn ${isRecording ? 'recording' : ''}`} 
                                onClick={toggleRecording}
                             >
                                <motion.div animate={isRecording ? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] } : {}} transition={isRecording ? { repeat: Infinity, duration: 1.5 } : {}}>
                                   <Mic size={20} color={isRecording ? 'red' : 'currentColor'}/>
                                </motion.div>
                             </button>
                          )}
                       </div>
                    </div>
                 </div>
              </form>
              <div className="hints" style={{textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--muted)'}}>
                 <span>Use <kbd>Shift</kbd> + <kbd>Return</kbd> for a new line.</span>
              </div>
            </div>
          </div>
          
          {/* Artifacts Pane (Split Screen) */}
          <AnimatePresence>
            {activeArtifact && (
              <motion.div 
                 initial={isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                 animate={isMobile ? { height: '50%', opacity: 1 } : { width: '50%', opacity: 1 }}
                 exit={isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                 style={{ 
                    borderLeft: isMobile ? 'none' : '1px solid var(--hairline-strong)', 
                    borderTop: isMobile ? '1px solid var(--hairline-strong)' : 'none',
                    background: 'var(--surface-card)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 10
                 }}
              >
                 <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>Preview ({activeArtifact.type})</div>
                    <button onClick={() => setActiveArtifact(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}>
                       <X size={16} />
                    </button>
                 </div>
                 <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                    {activeArtifact.type === 'html' || activeArtifact.type === 'svg' ? (
                        <iframe 
                           srcDoc={activeArtifact.content} 
                           style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#fff' }} 
                           sandbox="allow-scripts"
                        />
                    ) : activeArtifact.type === 'csv' ? (
                        <div style={{ background: 'var(--surface-card)', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--hairline-strong)' }}>
                           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                              <thead>
                                 <tr>
                                    {activeArtifact.content.trim().split('\n')[0].split(',').map((h: string, i: number) => (
                                       <th key={i} style={{ borderBottom: '2px solid var(--hairline-strong)', padding: '12px', textAlign: 'left', background: 'var(--surface-soft)' }}>{h}</th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody>
                                 {activeArtifact.content.trim().split('\n').slice(1).map((row: string, i: number) => (
                                    <tr key={i}>
                                       {row.split(',').map((cell: string, j: number) => (
                                          <td key={j} style={{ borderBottom: '1px solid var(--hairline)', padding: '12px' }}>{cell}</td>
                                       ))}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--surface-card)', color: 'var(--ink)', padding: '24px', borderRadius: '8px', border: '1px solid var(--hairline-strong)', overflowX: 'auto', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                           {activeArtifact.content}
                        </div>
                    )}
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          </div>
        </div>
      </div>

      {/* Live Mode Full Screen Overlay */}
      <AnimatePresence>
         {isLiveMode && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  zIndex: 9999,
                  background: '#000',
                  display: 'flex',
                  flexDirection: 'column',
               }}
            >
               <div style={{ flex: 1, position: 'relative' }}>
                   <NinaAvatar />
                   
                   {/* Top Bar for Exit */}
                   <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
                       <button 
                          onClick={() => setIsLiveMode(false)}
                          style={{
                              width: '48px', height: '48px', borderRadius: '24px',
                              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                              backdropFilter: 'blur(10px)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#FFF', cursor: 'pointer',
                          }}
                       >
                           <X size={24} />
                       </button>
                   </div>

                   {/* Bottom Controls */}
                   <div style={{ position: 'absolute', bottom: '40px', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 100 }}>
                       
                        {/* Subtitle / Input box */}
                        <div style={{ width: '90%', maxWidth: '600px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>Nina is thinking...</div>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                       type="text" 
                                       value={input}
                                       onChange={(e) => setInput(e.target.value)}
                                       onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                                       placeholder="Say something..."
                                       style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '16px', minWidth: 0 }}
                                    />
                                    <button id="live-send-btn" onClick={handleSend} style={{ background: 'var(--primary)', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                        <Send size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mic Button */}
                        <button 
                           onClick={toggleRecording}
                           style={{
                               width: '64px', height: '64px', borderRadius: '32px',
                               background: isRecording ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.1)',
                               border: isRecording ? '2px solid #FF3B30' : '1px solid rgba(255,255,255,0.2)',
                               backdropFilter: 'blur(10px)',
                               display: 'flex', alignItems: 'center', justifyContent: 'center',
                               color: isRecording ? '#FF3B30' : '#FFF',
                               cursor: 'pointer',
                               boxShadow: isRecording ? '0 0 30px rgba(255,59,48,0.4)' : '0 4px 20px rgba(0,0,0,0.3)',
                               transition: 'all 0.2s',
                               marginTop: isMobile ? '-10px' : '0'
                           }}
                        >
                            <Mic size={28} />
                        </button>
                   </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }} 
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
             <div style={{ background: 'var(--surface)', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', border: '1px solid var(--border)' }}>
                <img src="/favicon.jpeg" alt="Kyza Logo" style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 20px', objectFit: 'cover', display: 'block' }} />
                <h2 style={{ marginBottom: '10px' }}>Sign in to KYZA</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px' }}>
                  Sign in with Google to save your chat history and unlock all features.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin 
                        onSuccess={handleGoogleLogin}
                        onError={() => console.error('Login Failed')}
                        useOneTap
                    />
                </div>
                <button onClick={() => setShowAuthModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '20px', cursor: 'pointer' }}>
                   Cancel
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
             <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--hairline-strong)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginBottom: '10px' }}>Delete Chat</h3>
                <p style={{ color: 'var(--text-sub)', lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to delete this chat? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                    <button onClick={() => setChatToDelete(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '12px', cursor: 'pointer', fontWeight: 500 }} className="hover-bg">
                        Cancel
                    </button>
                    <button onClick={confirmDeleteChat} style={{ padding: '10px 20px', background: '#FF3B30', border: 'none', color: '#FFF', borderRadius: '12px', cursor: 'pointer', fontWeight: 500 }}>
                        Delete
                    </button>
                </div>
             </div>
          </div>
        )}

        {previewImage && (
           <div 
              onClick={() => setPreviewImage(null)} 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)', cursor: 'zoom-out' }}
           >
              <img 
                 src={previewImage} 
                 alt="Preview Fullscreen" 
                 style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
                 onClick={(e) => e.stopPropagation()} 
              />
              <button 
                 onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                 style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                 title="Close Preview"
              >
                 <X size={24} />
              </button>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && user && (
           <ProfileModal 
              user={user} 
              onClose={() => setShowProfileModal(false)} 
              onLogout={handleLogout} 
           />
        )}
      </AnimatePresence>

    </div>
  );
}
