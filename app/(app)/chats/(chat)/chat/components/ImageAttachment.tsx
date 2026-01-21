'use client';

import { useState } from 'react';
import { Spinner } from 'flowbite-react';
import { HiRefresh, HiExclamation } from 'react-icons/hi';

interface ImageAttachmentProps {
  src: string;
  alt: string;
  onClick?: () => void;
}

export default function ImageAttachment({ src, alt, onClick }: ImageAttachmentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setError(false);
    // Force reload by appending timestamp
    const img = new Image();
    img.src = src;
    img.onload = handleLoad;
    img.onerror = handleError;
  };

  return (
    <div 
      className="relative rounded-xl overflow-hidden border border-current/10 bg-hover-bg"
      style={{ width: '100%', height: '250px' }}
    >
      {/* Loading Skeleton */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 animate-pulse z-10">
          <Spinner size="md" />
        </div>
      )}

      {/* Error State */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-text-secondary z-20 p-4 text-center">
          <HiExclamation className="w-8 h-8 mb-2 text-red-500" />
          <p className="text-xs mb-2">Error al cargar imagen</p>
          <button 
            onClick={handleRetry}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <HiRefresh className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      ) : (
        /* Image */
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
        />
      )}
    </div>
  );
}
