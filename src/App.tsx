import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Download, Check, Send, Globe, Mic, X, Ghost, Sun, Moon, Sparkles, PanelLeftClose, PanelLeftOpen, Volume2, ImageIcon, UserRound, LogIn, Copy, Trash2, Edit2, Eye } from 'lucide-react';
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
                                {(language === 'html' || language === 'svg' || language === 'csv' || language === 'markdown') && onPreview && (
                                    <button 
                                        onClick={() => onPreview(language, code.trim())}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        className="hover-text"
                                        title="Preview UI"
                                    >
                                        <Eye size={14} />
                                        Preview
                                    </button>
                                )}
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
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', width: '100vw', background: 'var(--canvas)', overflow: 'hidden' }}>
       <button 
          onClick={onTryGuest}
          style={{ position: 'absolute', top: '24px', right: '24px', padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', zIndex: 10, fontSize: '14px', letterSpacing: '0.5px' }}
          className="hover-bg"
       >
          TRY KYZA
       </button>
       
       <div style={{ flex: isMobile ? 1 : '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: isMobile ? 'none' : '1px solid var(--hairline-strong)', borderBottom: isMobile ? '1px solid var(--hairline-strong)' : 'none', padding: '40px', background: 'var(--surface)' }}>
          <iframe src="/kyza-ad.html" style={{ width: '100%', maxWidth: '600px', height: '100%', maxHeight: '800px', border: 'none', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} title="KYZA Ad" />
       </div>

       <div style={{ flex: isMobile ? 1 : '1 1 50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '40px' }}>
          
          <img src="/logo.jpeg" alt="Kyza Logo" style={{ width: '140px', height: '140px', borderRadius: '32px', marginBottom: '32px', boxShadow: '0 12px 48px rgba(0,0,0,0.4)', border: '1px solid var(--hairline-strong)', objectFit: 'cover' }} />
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--ink)', marginBottom: '12px', textAlign: 'center', letterSpacing: '-0.5px' }}>Welcome to KYZA</h1>
          <p style={{ color: 'var(--text-sub)', marginBottom: '40px', fontSize: '16px', textAlign: 'center', maxWidth: '300px' }}>Your personal AI assistant. Log in to get started.</p>
          
          <div style={{ transform: 'scale(1.1)' }}>
              <GoogleLogin 
                 onSuccess={onLoginSuccess}
                 onError={() => console.error('Login Failed')}
                 useOneTap
              />
          </div>
       </div>
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
       setIsAuthLoading(false);
       
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
    };
    if (import.meta.env.VITE_SUPABASE_URL) initAuth();
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
                                                    const targetChat = chatHistory.find(c => c.sessionId === chat.sessionId);
                                                    if (targetChat) {
                                                        setMessages(targetChat.messages.map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments || [] })));
                                                    } else {
                                                        setMessages([]);
                                                    }
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

                 {}
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
          <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile && activeArtifact ? (isArtifactFullScreen ? '0%' : '50%') : '100%', position: 'relative', overflow: 'hidden' }}>
              
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
                               style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                  gap: '4px', 
                                  marginBottom: '24px' 
                               }}
                            >
                               <div className="content" style={{ margin: 0, maxWidth: '85%' }}>
                                  <div className="text" style={{ 
                                     whiteSpace: 'pre-wrap', 
                                     lineHeight: '1.5',
                                     padding: msg.role === 'user' ? '12px 16px' : '4px 0',
                                     borderRadius: '18px',
                                     borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                                     borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                                     background: msg.role === 'user' ? 'var(--surface-card)' : 'transparent',
                                     color: 'var(--ink)'
                                  }}>
                                     {renderMessageContent(msg.content, (type, content) => setActiveArtifact({type, content}))}
                                  </div>

                                  {msg.attachments && msg.attachments.length > 0 && (
                                      <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'}}>
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
                                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                          <button 
                                             onClick={() => {
                                                speakWithHorimiyaVoice(msg.content);
                                             }}
                                             style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-sub)' }}
                                            className="hover-bg"
                                         >
                                            <Volume2 size={14}/> Read aloud
                                         </button>
                                         
                                         {getPreviewableArtifact(msg.content) && (
                                             <button 
                                                 onClick={() => {
                                                     setActiveArtifact(getPreviewableArtifact(msg.content));
                                                 }}
                                                 style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-soft)', border: '1px solid var(--hairline)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-sub)' }}
                                                 className="hover-bg"
                                             >
                                                <Eye size={14}/> Preview
                                             </button>
                                         )}
                                      </div>
                                   )}
                                </div>
                            </motion.article>
                         ))}
                         {isLoading && (
                            <motion.article className="message assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                               <div className="content" style={{ margin: 0 }}>
                                  <LoadingIndicator selectedModel={selectedModel} />
                               </div>
                            </motion.article>
                         )}
                       </AnimatePresence>
                       <div ref={messagesEndRef} />
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
                     ) : getGreeting()}
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
                    {attachments.length > 0 && (
                       <div style={{ display: 'flex', gap: '8px', padding: '8px 8px 0 8px', flexWrap: 'wrap' }}>
                          {attachments.map((att, idx) => (
                             <div key={idx} style={{ position: 'relative' }}>
                                <img src={att} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--hairline-strong)' }} />
                                <button 
                                   type="button"
                                   onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                   style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--surface-strong)', border: '1px solid var(--hairline-strong)', color: 'var(--ink)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                >
                                   <X size={12} />
                                </button>
                             </div>
                          ))}
                       </div>
                    )}
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
          
          {}
          <AnimatePresence>
            {activeArtifact && (
              <motion.div 
                 initial={isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                 animate={isMobile ? { height: isArtifactFullScreen ? '100%' : '50%', opacity: 1 } : { width: '50%', opacity: 1 }}
                 exit={isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
                 <motion.div 
                    drag={isMobile ? "y" : false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_e: any, info: any) => {
                        if (isMobile) {
                            if (info.offset.y < -30) setIsArtifactFullScreen(true);
                            else if (info.offset.y > 30) {
                                if (isArtifactFullScreen) setIsArtifactFullScreen(false);
                                else setActiveArtifact(null);
                            }
                        }
                    }}
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isMobile ? 'grab' : 'default', touchAction: 'none' }}
                 >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Preview ({activeArtifact.type})
                        {isMobile && <div style={{ width: '36px', height: '4px', background: 'var(--hairline-strong)', borderRadius: '2px' }} />}
                    </div>
                    <button onClick={() => {
                        setActiveArtifact(null);
                        setIsArtifactFullScreen(false);
                    }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}>
                       <X size={16} />
                    </button>
                 </motion.div>
                 <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                    {activeArtifact.type === 'html' || activeArtifact.type === 'svg' ? (
                        <iframe 
                           srcDoc={activeArtifact.content} 
                           style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#fff' }} 
                           sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-same-origin"
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

      {}
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
                   
                   {}
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

                   {}
                   <div style={{ position: 'absolute', bottom: '40px', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 100 }}>
                       
                        {}
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

                        {}
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
