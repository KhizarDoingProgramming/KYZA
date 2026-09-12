import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Download, Check, Send, Globe, Mic, X, Ghost, Sun, Moon, Sparkles, PanelLeftClose, PanelLeftOpen, Volume2, ImageIcon, UserRound, LogIn, Copy, Trash2, Edit2, Eye } from 'lucide-react';
import NinaAvatar from './NinaAvatar';
import ShaderCanvas from './ShaderCanvas';
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

const renderMessageContent = (content: string, onPreview?: (type: string, content: string) => void) => {
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
                        {(language === 'html' || language === 'svg' || language === 'csv' || language === 'markdown') && onPreview && (
                            <button 
                                onClick={() => onPreview(language, code.trim())}
                                style={{ width: '100%', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: 'none', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}
                                className="hover-bg"
                            >
                                <Eye size={16} />
                                Preview Generated UI
                            </button>
                        )}
                    </div>
                );
            }
        }
        
        // Parse markdown images ![alt](url)
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const textParts = part.split(imageRegex);
        
        if (textParts.length === 1) {
            return <span key={index}>{part}</span>;
        }
        
        const renderedTextParts = [];
        for (let i = 0; i < textParts.length; i += 3) {
            if (textParts[i]) renderedTextParts.push(<span key={`t-${index}-${i}`}>{textParts[i]}</span>);
            if (i + 1 < textParts.length) {
                const alt = textParts[i+1];
                const url = textParts[i+2];
                renderedTextParts.push(
                    <div key={`img-${index}-${i}`} style={{ margin: '16px 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxWidth: '400px' }}>
                        <img src={url} alt={alt || 'Generated Image'} style={{ width: '100%', display: 'block', marginBottom: '-40px' }} loading="lazy" />
                    </div>
                );
            }
        }
        
        return <span key={index}>{renderedTextParts}</span>;
    });
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
        return "Good morning. Systems online and ready.";
    } else if (hour >= 12 && hour < 17) {
        return "Good afternoon. What's on the agenda?";
    } else if (hour >= 17 && hour < 22) {
        return "Good evening. Still grinding?";
    } else {
        return "Late night, huh? Let's get this done.";
    }
};

const LandingPage = ({ onLoginSuccess, onTryGuest, isMobile }: { onLoginSuccess: any, onTryGuest: () => void, isMobile: boolean }) => {
  return (
    <div className="app-container flex-center" style={{ position: 'relative' }}>
       {/* Background Glows */}
       <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'var(--accent-primary)', opacity: 0.15, filter: 'blur(100px)', borderRadius: '50%' }} />
       <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'var(--accent-secondary)', opacity: 0.15, filter: 'blur(100px)', borderRadius: '50%' }} />

       <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel" 
          style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90%', maxWidth: '420px', zIndex: 10, textAlign: 'center' }}
       >
          <img src="/logo.jpeg" alt="Kyza Logo" style={{ width: '80px', height: '80px', borderRadius: '24px', marginBottom: '24px', border: '1px solid var(--border-subtle)' }} />
          
          <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>Welcome to KYZA</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px' }}>Experience the next generation of AI.</p>
          
          <div style={{ width: '100%', marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin 
                 onSuccess={onLoginSuccess}
                 onError={() => console.error('Login Failed')}
                 useOneTap
                 theme="filled_black"
                 shape="pill"
              />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          <button 
             onClick={onTryGuest}
             className="send-button"
             style={{ width: '100%', height: '44px', borderRadius: 'var(--radius-pill)', display: 'flex', justifyContent: 'center', fontWeight: 500, fontSize: '15px', background: 'var(--bg-surface-hover)', color: 'var(--text-primary)' }}
          >
             Continue as Guest
          </button>
       </motion.div>
    </div>
  );
};

const LoadingIndicator = ({ selectedModel }: { selectedModel: any }) => {
  const [phrase, setPhrase] = useState('');
  
  useEffect(() => {
     const isPrism = selectedModel?.id === 'prism';
     const options = isPrism ? [
       "generating your masterpiece...",
       "painting pixels...",
       "brewing some art...",
       "waking up the artist...",
       "getting the canvas ready..."
     ] : [
       "cooking up some heat...",
       "bet, give me a sec...",
       "brain blasting...",
       "let him cook...",
       "vibing with the servers...",
       "connecting to the mainframe...",
       "asking the oracle...",
       "hold up...",
       "gathering the lore...",
       "getting that bread...",
       "doing the math..."
     ];
     setPhrase(options[Math.floor(Math.random() * options.length)]);
     
     const interval = setInterval(() => {
        setPhrase(options[Math.floor(Math.random() * options.length)]);
     }, 2000);
     return () => clearInterval(interval);
  }, [selectedModel]);

  return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
          <video 
              src="/thinking.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              ref={v => { if (v) v.playbackRate = 2.0; }}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <motion.div 
             animate={{ opacity: [0.3, 1, 0.3] }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
             style={{ color: 'var(--text-sub)', fontStyle: 'italic', fontSize: '14px', fontWeight: 500 }}
          >
             {phrase}
          </motion.div>
      </div>
  );
};

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState(getSessionId());
  const currentSessionIdRef = useRef(currentSessionId);
  useEffect(() => {
     currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);
  
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
  
  
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  
  const [isRecording, setIsRecording] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<{type: string, content: string} | null>(null);
  const [isArtifactFullScreen, setIsArtifactFullScreen] = useState(false);

  const getPreviewableArtifact = (content: string) => {
      const match = content.match(/```(html|svg|csv|markdown)\n([\s\S]*?)```/);
      if (match) {
          return { type: match[1], content: match[2].trim() };
      }
      return null;
  };
  
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  const deleteChat = async (sessionId: string) => {
      if (!sessionId) return;
      
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
          
          const { error } = await supabase.from('deleted_chats').insert([{
              session_id: sessionId,
              user_id: user.id
          }]);
          if (error) console.error("Supabase insert deleted_chat error:", error);
      }
  };

  useEffect(() => {
    const initAuth = async () => {
       try {
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
             setUser(newSession?.user ?? null);
             setIsAuthLoading(false);
             if (newSession?.user) {
                
                const { error: updateError } = await supabase.from('chats').update({ user_id: newSession.user.id }).eq('session_id', currentSessionIdRef.current).is('user_id', null);
                if (updateError) console.error("Supabase update error:", updateError);
                fetchChats(newSession.user);
                if (newSession.user && showAuthModal) setShowAuthModal(false);
             }
          });
          fetchChats(session?.user ?? null);
          
          return () => subscription.unsubscribe();
       } catch (error) {
          console.error("Auth init error:", error);
       } finally {
          setIsAuthLoading(false);
       }
    };
    if (import.meta.env.VITE_SUPABASE_URL) {
       initAuth();
    } else {
       setIsAuthLoading(false);
    }
  }, []);

  const fetchChats = async (currentUser: User | null) => {
    try {
      const localSessionId = currentSessionIdRef.current;
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
    if (!text || text.trim() === '') return; // Don't speak if there's no text left

    const speakFn = () => {
        const u = new SpeechSynthesisUtterance(text);
        
        (window as any).currentUtterance = u;
        
        u.pitch = 1.3; 
        u.rate = 1.05; 
        u.onerror = (e) => console.error("TTS Error:", e);
    
        const voices = window.speechSynthesis.getVoices();
        
        
        const hasUrdu = /[\u0600-\u06FF]/.test(text);
        
        let voiceToUse;
        if (hasUrdu) {
            voiceToUse = 
                voices.find(v => v.lang === 'ur-PK' && (v.name.includes('Female') || v.name.includes('Google'))) ||
                voices.find(v => v.lang.includes('ur') && (v.name.includes('Female') || v.name.includes('Google'))) ||
                voices.find(v => v.lang.includes('ur')) ||
                voices.find(v => v.lang.includes('hi') && (v.name.includes('Female') || v.name.includes('Google'))) ||
                voices.find(v => v.lang.includes('hi'));
                
            u.pitch = 1.0; 
            u.rate = 1.0;
            u.lang = voiceToUse ? voiceToUse.lang : 'ur-PK';
        } else {
            
            voiceToUse = voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Microsoft Zira') || v.name.includes('Samantha'))) || 
                         voices.find(v => v.name.includes('Female')) || 
                         voices.find(v => v.lang.includes('en-US')) ||
                         voices.find(v => v.lang.includes('en'));
            u.lang = voiceToUse ? voiceToUse.lang : 'en-US';
        }
        
        if (voiceToUse) {
            u.voice = voiceToUse;
        }
        
        window.speechSynthesis.speak(u);
    };

    
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        setTimeout(speakFn, 100);
    } else {
        speakFn();
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kyza-theme', theme);
  }, [theme]);

  const autoSize = (el: HTMLTextAreaElement) => {
    const scrollTop = el.scrollTop;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (el.selectionStart === el.value.length) {
       el.scrollTop = el.scrollHeight;
    } else {
       el.scrollTop = scrollTop;
    }
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
            
            
            setChatHistory(prev => {
                if (prev.find(h => h.sessionId === currentSessionId)) return prev;
                const storedTitles = JSON.parse(localStorage.getItem('kyza_titles') || '{}');
                return [{
                    sessionId: currentSessionId,
                    title: storedTitles[currentSessionId] || (newMsg.content.length > 25 ? newMsg.content.substring(0, 25) + '...' : newMsg.content),
                    created_at: new Date().toISOString(),
                    messages: [newMsg]
                }, ...prev];
            });
        }
    } catch(e) { console.error(e) }
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    if (currentMessages.length === 1 && !isIncognito) {
        // Fire off title generation concurrently with the chat response
        fetch('/api/generate_title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentMessages })
        }).then(res => res.json()).then(titleData => {
            if (titleData.title) {
                const storedTitles = JSON.parse(localStorage.getItem('kyza_titles') || '{}');
                storedTitles[currentSessionId] = titleData.title;
                localStorage.setItem('kyza_titles', JSON.stringify(storedTitles));
                setChatHistory(prev => prev.map(chat => chat.sessionId === currentSessionId ? { ...chat, title: titleData.title } : chat));
            }
        }).catch(err => console.error("Failed to generate title:", err));
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


  useEffect(() => {
    if (currentSessionId && chatHistory) {
      const activeChat = chatHistory.find(c => c.sessionId === currentSessionId);
      if (activeChat && activeChat.title) {
        document.title = activeChat.title;
      } else {
        document.title = 'KYZA';
      }
    } else {
      document.title = 'KYZA';
    }
  }, [currentSessionId, chatHistory]);

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
    // Pre-load voices for Chrome
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };

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

  if (isAuthLoading) {
      return (
          <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 582.54 222.34" style={{ maxWidth: '50%', maxHeight: '50%' }}>
                  <path className="outline" d="M162.57.18c13.83-2.55 23.68 23.61 28.74 24.63 7.71-3.99 21.53.45 27.92-.82 4.55-.91 14.24-22.57 24.63-23.81 17.15-2.04 14.79 36.19 16.83 45.57 2.57 11.8 10.05 25.14 11.08 38.18 37.74-5.26 82.76 5.69 100.99 41.87 32.86-2.84 94.25 4.16 87.44 50.49-2.22 15.1-31.14 47.68-47.21 37.36-6.7-4.31-4.04-16.17-.41-21.76 6.21-9.56 25.37-9.69 19.71-25.45-4.68-13.02-39.89-12.01-51.32-11.91-.55 22.17.9 47.75-18.88 62.4l220.45 2.87c-194.12 3.8-388.38 2.82-582.54.41l167.08-3.69c-13.21-12.37-19.87-34.88-21.35-52.55-1.07-12.84 3-34.48 1.64-44.34-.66-4.77-5.85-13.3-6.57-21.35-2.04-22.93 5.28-31.7 9.03-50.91 1.73-8.83.84-45.02 12.73-47.21Z" />
                  <path className="detail-1" d="M164.21 7.56c12.29 1.4 15.6 23.65 26.27 24.63 3.05.28 5.99-1.66 7.39-1.64 5.19.05 19.38 1.49 22.99.82 7.75-1.44 20.26-29.42 26.68-22.58 4.91 5.23 4.99 32.51 6.57 40.23 1.79 8.78 7.64 18.57 9.03 28.74 2.26 16.42-3.64 40.57 7.39 54.19 3.23 3.99 10.52 9.57 13.14 2.46-5.44-5.7-10.6-9.84-12.32-18.06-.88-4.23-2.41-24.29 2.05-25.86 1.16-.41 21.91-.96 24.63-.82 26.5 1.31 58.6 15.76 69.38 41.46 7.41 17.67 10.78 65.55-6.98 77.59-4.25 2.88-22.4 6.96-27.09 5.75-9.76-2.52 2.81-18.94 4.52-24.22 1.32-4.11 6.89-25.37-1.23-24.22-3.4.48-3.65 16.18-5.34 20.94-13.69 38.5-71.14 26.52-102.22 28.33 8.41-8.44 16.08-17.66 20.12-29.15 1.2-3.42 7.68-21.98-1.23-19.29-1.46.44-8.15 23.47-11.08 28.33-4.37 7.22-17.43 19.36-25.86 20.12-12.27 1.1.86-8.48 2.87-11.91 2.31-3.93 10.33-22.04 9.03-25.45-7.52-7.63-10.37 13.97-13.96 19.71-5.63 8.98-13.91 13.67-21.35 3.28-3.1-4.33-4.17-23.8-10.26-18.47-7.63 6.67 15.49 33.71-.82 31.2-16.33-2.51-23.68-45.59-24.22-58.71-.43-10.38 3.43-28.31 2.46-36.13-.24-1.92-5.05-10.35-5.75-13.96-5.01-25.82 3.71-36 8.21-58.29 1.04-5.15 1.36-37.27 6.98-39Z" />
                  <path className="detail-2" d="M379.33 132.36c30.98-5.73 95.08 13.74 67.74 56.24-3.26 5.06-27.6 28.22-31.2 17.24-4.11-12.54 20.42-17.37 23.81-27.92 5.6-17.44-10.67-26.44-25.04-29.15-6.33-1.19-33.79-.73-35.31-1.64-.72-.43-2-11.17-3.69-12.73-.37-1.06 3.18-1.96 3.69-2.05Z" />
                  <path className="detail-3" d="M201.98 97.06c1.9-.74 8.54-.23 9.44 2.05 1.87 4.74-8.49 11.29-.41 13.55 5.56 1.55 7.28-3.17 8.21-3.28 5.16-.62-.43 7.92-8.21 6.57-1.22-.21-4.63-3.27-4.93-3.28-.89-.03-13.24 8.02-15.6-.82-1.69-6.33 10.92 6.05 13.55-2.05-2.43-2.83-7.11-10.76-2.05-12.73ZM234.82 80.64c3.29-.54 13.63 1.22 12.73 6.16-1.03 5.58-18.35.18-21.76 6.16l-.82-2.46c1.52-3.85 5.53-9.14 9.85-9.85ZM169.96 80.64c7.65-1.46 14.5 4.09 16.83 11.08l-21.76-2.87c-2.95-3.33 1.68-7.59 4.93-8.21Z" />
                  <path className="detail-4" d="M238.93 18.24c9.56-4.09 7.52 18.39 2.46 18.88-10.04.99-4.59-17.97-2.46-18.88ZM167.49 18.24c7.17-2.45 11.42 17.43 4.11 18.88-8.72 1.74-3.91-11.86-6.16-16.83.04-.14 1.89-2 2.05-2.05ZM237.28 104.45c3.4-1.19 14.88.38 16.83 4.52-5.85.19-10.68-4.21-16.83-1.23-1.57-.86-1.56-2.74 0-3.28ZM164.21 96.24c1.94-.33 13.04-.07 12.73 2.87-5.87 1.01-11.8-2.24-17.65 1.23-1.9-2.6 3.51-3.86 4.93-4.11ZM240.57 96.24c3.16-.5 10.63-.23 12.73 2.87-6.03.34-12.01-1.78-17.65 1.23-1.82-3.05 2.69-3.75 4.93-4.11ZM165.03 104.45c1.88-.33 10.05-.95 10.26 2.05-2.9 1.19-6.58-.22-9.44.41-1.28.28-9.29 5.29-6.98 1.23 1.22-1.52 4.42-3.39 6.16-3.69ZM321.85 210.36l1.64 5.75-10.26.41 8.62-6.16ZM190.48 212.01c.56-.25 7.22 1.9 7.8 3.69-3.31 2.34-13.49-1.18-7.8-3.69Z" />
              </svg>
          </div>
      );
  }

  if (!user && !isGuest) {
      return <LandingPage onLoginSuccess={handleGoogleLogin} onTryGuest={() => setIsGuest(true)} isMobile={isMobile} />;
  }

   return (
    <div className="app-container">
      {/* Animated Background */}
      <div className={`animated-bg ${messages.length > 0 ? 'active' : ''}`}>
         <ShaderCanvas />
      </div>

      {/* Header */}
      <header className="app-header">
         <button className="header-btn icon-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <PanelLeftOpen size={18} />
         </button>
         
         <button className="header-btn icon-only" onClick={() => setShowProfileModal(true)}>
            <UserRound size={18} />
         </button>
      </header>

      {/* Sidebar Overlay & Panel */}
      <AnimatePresence>
         {isSidebarOpen && (
             <>
                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="sidebar-overlay"
                   onClick={() => setIsSidebarOpen(false)}
                />
                <motion.div 
                   initial={{ x: '-100%' }}
                   animate={{ x: 0 }}
                   exit={{ x: '-100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                   className="sidebar"
                >
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Chat History</h2>
                      <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                   </div>
                   <button 
                      onClick={() => { setCurrentSessionId('anon-' + Math.random().toString(36).substring(2, 15)); setMessages([]); setIsSidebarOpen(false); }}
                      style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '10px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                   >
                      <Plus size={16} /> New Chat
                   </button>
                   <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {chatHistory.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>No history yet.</div>}
                      {chatHistory.map(chat => (
                         <div 
                            key={chat.sessionId || Math.random()} 
                            className={`chat-history-item ${chat.sessionId === currentSessionId ? 'active' : ''}`} 
                            onClick={() => { 
                               setCurrentSessionId(chat.sessionId); 
                               setMessages(chat.messages || []); 
                               setIsSidebarOpen(false); 
                            }}
                         >
                            <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                               {chat.title || 'Untitled Chat'}
                            </div>
                            <button 
                               onClick={(e) => { e.stopPropagation(); deleteChat(chat.sessionId); }} 
                               style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                               title="Delete Chat"
                            >
                               <Trash2 size={14} />
                            </button>
                         </div>
                      ))}
                   </div>
                </motion.div>
             </>
         )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && user && (
           <ProfileModal 
              user={user} 
              onClose={() => setShowProfileModal(false)} 
              onLogout={() => supabase.auth.signOut()} 
           />
        )}
      </AnimatePresence>
      
      {/* Full-Screen Nina Mode */}
      <AnimatePresence>
        {isLiveMode && (
           <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="nina-fullscreen-overlay"
           >
              <div className="nina-canvas-container">
                  <NinaAvatar />
              </div>
              <div className="nina-ui-layer">
                 <div className="nina-header">
                    <h2 style={{ fontSize: '24px', fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Nina Mode</h2>
                    <button className="nina-close-btn" onClick={() => setIsLiveMode(false)}>
                       <X size={24} />
                    </button>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '16px', pointerEvents: 'auto' }}>
                    {/* Voice visualizer placeholder */}
                    <div style={{ padding: '16px 32px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', borderRadius: '999px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Listening...</span>
                       <div style={{ display: 'flex', gap: '4px', height: '16px', alignItems: 'center' }}>
                          <motion.div animate={{ height: ['4px', '16px', '4px'] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: '4px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                          <motion.div animate={{ height: ['4px', '12px', '4px'] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} style={{ width: '4px', background: 'var(--accent-secondary)', borderRadius: '2px' }} />
                          <motion.div animate={{ height: ['4px', '16px', '4px'] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} style={{ width: '4px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                       </div>
                    </div>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, width: '100%', overflow: 'hidden' }}>
          <div className="chat-scroll-area" style={{ flex: messages.length > 0 ? 1 : 0, overflowY: 'auto', padding: messages.length > 0 ? '24px' : 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.map((msg, index) => (
              <motion.div 
                 key={index}
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ type: "spring", stiffness: 400, damping: 30 }}
                 className={`message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                 {renderMessageContent(msg.content, (type, content) => setActiveArtifact({type, content}))}
                 {msg.attachments && msg.attachments.length > 0 && (
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                         {msg.attachments.map((att: string, i: number) => (
                             <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxWidth: '400px' }}>
                                 <img src={att} alt="Generated Image" style={{ width: '100%', display: 'block', marginBottom: '-40px' }} loading="lazy" />
                             </div>
                         ))}
                     </div>
                 )}
              </motion.div>
          ))}
          {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="message-bubble assistant">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '24px' }}>
                     <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: '6px', height: '6px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
                     <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: '6px', height: '6px', background: 'var(--accent-secondary)', borderRadius: '50%' }} />
                     <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: '6px', height: '6px', background: 'var(--text-primary)', borderRadius: '50%' }} />
                  </div>
              </motion.div>
          )}
          <div ref={messagesEndRef} />
      </div>

      <motion.div 

         className="input-container-wrapper"
         initial={false}
         transition={{ type: 'spring', stiffness: 350, damping: 30 }}
         style={{ 
             marginTop: messages.length === 0 ? 'auto' : '0',
             marginBottom: messages.length === 0 ? 'auto' : '40px',
             display: 'flex', 
             flexDirection: 'column', 
             alignItems: 'center', 
             gap: '12px',
             position: 'relative'
         }}
      >
         {messages.length === 0 && (
             <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gradient" 
                style={{ fontSize: '42px', fontWeight: 700, marginBottom: '16px' }}>
                How can I help you today?
             </motion.h1>
         )}

         <div style={{ position: 'relative', display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
             <button className="header-btn" onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}>
                {selectedModel.name} <ChevronDown size={14} />
             </button>
             <AnimatePresence>
                {isModelDropdownOpen && (
                   <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="glass-panel"
                      style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px', zIndex: 100, pointerEvents: 'auto' }}
                   >
                      {MODELS.map(model => (
                         <button 
                            key={model.id}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', textAlign: 'left', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            className="hover-bg"
                            onClick={() => { setSelectedModel(model); setIsModelDropdownOpen(false); }}
                         >
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>{model.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{model.description}</div>
                         </button>
                      ))}
                   </motion.div>
                )}
             </AnimatePresence>
         </div>

         <form 
            className="input-glass-bar" 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ pointerEvents: 'auto' }}
         >
            <div className="input-actions-left">
               <button type="button" className={`input-toggle-btn ${webSearchEnabled ? 'active' : ''}`} onClick={() => setWebSearchEnabled(!webSearchEnabled)} title="Web Search">
                  <Globe size={18} />
               </button>
               <button type="button" className={`input-toggle-btn ${imageGenEnabled ? 'active' : ''}`} onClick={() => setImageGenEnabled(!imageGenEnabled)} title="Image Generation">
                  <ImageIcon size={18} />
               </button>
               <button type="button" className={`input-toggle-btn ${isRecording ? 'active' : ''}`} onClick={() => setIsRecording(!isRecording)} title="Voice Input">
                  <Mic size={18} />
               </button>
               <button type="button" className={`input-toggle-btn ${isLiveMode ? 'active' : ''}`} onClick={() => setIsLiveMode(!isLiveMode)} title="Nina Mode">
                  <Ghost size={18} />
               </button>
            </div>

            <input
               className="input-field"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Ask anything..."
               disabled={isLoading}
            />
            <button 
               type="submit" 
               className="send-button"
               disabled={!input.trim() || isLoading}
            >
               <Send size={18} />
            </button>
         </form>


      </motion.div>
      </div>

      <AnimatePresence>
         {activeArtifact && (
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : '50%', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', zIndex: 100, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(20px)' }}
            >
               <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <div onClick={() => setActiveArtifact(null)} style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', cursor: 'pointer', boxShadow: '0 0 10px rgba(255,95,86,0.5)' }} title="Close" />
                     <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                     <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                     <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '60%', border: '1px solid var(--border-subtle)' }}>
                        <Globe size={12} />
                        <span>localhost:3000/preview/{activeArtifact.type}</span>
                     </div>
                  </div>
                  <div style={{ display: 'flex', width: 44, justifyContent: 'flex-end' }}>
                     {/* Space for balance */}
                  </div>
               </div>
               <div style={{ flex: 1, overflow: 'auto', background: activeArtifact.type === 'html' || activeArtifact.type === 'svg' ? '#ffffff' : 'transparent' }}>
                  {activeArtifact.type === 'html' || activeArtifact.type === 'svg' ? (
                     <iframe 
                         srcDoc={activeArtifact.type === 'html' 
                             ? (activeArtifact.content.includes('<head>') 
                                 ? activeArtifact.content.replace('<head>', '<head><base target="_blank">')
                                 : `<base target="_blank">\n${activeArtifact.content}`)
                             : activeArtifact.content} 
                         style={{ width: '100%', height: '100%', border: 'none' }} 
                         title="Preview" 
                         sandbox="allow-scripts allow-forms allow-same-origin allow-popups" 
                     />
                  ) : (
                     <pre style={{ margin: 0, padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {activeArtifact.content}
                     </pre>
                  )}
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
