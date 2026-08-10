import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LogOut, Upload, UserRound } from 'lucide-react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileModal({ user, onClose, onLogout }: ProfileModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const metadata = user.user_metadata;
  const avatarUrl = metadata.avatar_url;
  const fullName = metadata.full_name || 'Anonymous User';
  const email = user.email || '';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setErrorMsg('');
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setIsUploading(true);

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update user auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '1px solid var(--border)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Your Profile</h2>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100px', height: '100px', borderRadius: '50px', objectFit: 'cover', border: '2px solid var(--primary)' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50px', background: 'var(--canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border)' }}>
                <UserRound size={40} color="var(--text-sub)" />
              </div>
            )}
            
            <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: 'white', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isUploading ? 'default' : 'pointer', border: '2px solid var(--surface)' }}>
              <Upload size={16} />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                disabled={isUploading}
                style={{ display: 'none' }} 
              />
            </label>
          </div>
          
          <h3 style={{ margin: '0 0 5px 0' }}>{fullName}</h3>
          <p style={{ color: 'var(--text-sub)', margin: 0 }}>{email}</p>
          
          {isUploading && <p style={{ color: 'var(--primary)', fontSize: '12px', marginTop: '10px' }}>Uploading...</p>}
          {errorMsg && <p style={{ color: '#FF3B30', fontSize: '12px', marginTop: '10px' }}>{errorMsg}</p>}
        </div>

        <button 
           onClick={onLogout}
           style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '12px', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '12px', cursor: 'pointer', fontWeight: 500 }}
        >
           <LogOut size={18} /> Sign Out
        </button>
      </div>
    </motion.div>
  );
}
