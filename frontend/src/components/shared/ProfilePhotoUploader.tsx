"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';

export interface ProfilePhotoUploaderProps {
  currentPhotoUrl?: string | null;
  name?: string;
  onPhotoUploaded: (uploadedUrl: string) => void;
  onPhotoRemoved?: () => void;
  title?: string;
  description?: string;
  allowSelfUpdate?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProfilePhotoUploader({
  currentPhotoUrl,
  name = '',
  onPhotoUploaded,
  onPhotoRemoved,
  title = "Photo de profil",
  description = "Format JPG, PNG ou WebP. Taille maximale : 5 Mo.",
  allowSelfUpdate = true,
  className = '',
  size = 'md',
}: ProfilePhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Déterminer la source de l'image affichée
  const displaySrc = previewUrl || currentPhotoUrl || '/avatars/default_avatar.svg';

  const avatarSizeClass = size === 'sm' ? 'w-14 h-14' : size === 'lg' ? 'w-24 h-24' : 'w-20 h-20';

  const handleFile = useCallback(async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation du type MIME
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Format invalide. Veuillez sélectionner une image JPEG, PNG ou WebP.");
      return;
    }

    // Validation de la taille (5 Mo max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Fichier trop volumineux. La taille maximale autorisée est de 5 Mo.");
      return;
    }

    // Prévisualisation immédiate locale
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Téléversement vers le backend Django
    setIsUploading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('apply_to_self', allowSelfUpdate ? 'true' : 'false');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${apiBase}/api/accounts/upload-avatar/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Échec du téléversement de l'image.");
      }

      const data = await response.json();
      const finalUrl = data.url || data.profile_picture_url || data.avatar;

      setSuccessMsg("Photo enregistrée avec succès.");
      onPhotoUploaded(finalUrl);

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      console.error("Erreur upload photo:", err);
      setErrorMsg(err.message || "Impossible de téléverser la photo.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [allowSelfUpdate, onPhotoUploaded]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onPhotoRemoved) {
      onPhotoRemoved();
    } else {
      onPhotoUploaded('/avatars/default_avatar.svg');
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {title && (
        <div>
          <h4 className="text-xs font-semibold text-[#242124] dark:text-white flex items-center gap-1.5">
            <Icons.Camera size={14} className="text-[#4F6CE8]" />
            <span>{title}</span>
          </h4>
          {description && (
            <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Messages de feedback */}
      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Icons.CheckCircle size={14} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Icons.AlertCircle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Zone interactive d'upload */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Vignette Preview */}
        <div className="relative group shrink-0">
          <div className={`${avatarSizeClass} rounded-2xl overflow-hidden bg-black/5 dark:bg-white/10 border-2 border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center relative`}>
            <img
              src={displaySrc}
              alt={name || "Photo de profil"}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/avatars/default_avatar.svg';
              }}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                <span className="text-[9px] font-medium">Envoi...</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label="Changer la photo"
            className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[#4F6CE8] text-white shadow-md hover:bg-[#3D5BD9] transition-all cursor-pointer disabled:opacity-50"
            title="Changer la photo"
          >
            <Icons.Camera size={12} />
          </button>
        </div>

        {/* Zone de Glisser-Déposer / Sélection */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 w-full p-3.5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
            isDragging
              ? 'border-[#4F6CE8] bg-[#4F6CE8]/10'
              : 'border-black/10 dark:border-white/10 hover:border-[#4F6CE8]/50 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-[#4F6CE8]/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onInputChange}
            className="hidden"
          />
          <div className="flex items-center gap-2 text-xs font-semibold text-[#242124] dark:text-white">
            <Icons.Upload size={14} className="text-[#4F6CE8]" />
            <span>{isDragging ? "Déposez l'image ici" : "Cliquez ou glissez une photo ici"}</span>
          </div>
          <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
            JPG, PNG ou WebP jusqu&apos;à 5 Mo
          </p>
        </div>

        {/* Bouton Réinitialiser / Supprimer */}
        {displaySrc && displaySrc !== '/avatars/default_avatar.svg' && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isUploading}
            className="px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA] transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            title="Supprimer la photo et utiliser la silhouette par défaut"
          >
            <Icons.Trash size={13} />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        )}
      </div>
    </div>
  );
}
