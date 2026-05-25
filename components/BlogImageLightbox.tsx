'use client';

import { useEffect, useState } from 'react';

type LightboxImage = {
  alt: string;
  src: string;
};

export default function BlogImageLightbox() {
  const [image, setImage] = useState<LightboxImage | null>(null);

  useEffect(() => {
    const openImage = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (!target.closest('.blog-article')) return;

      setImage({
        alt: target.alt || '',
        src: target.currentSrc || target.src,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImage(null);
    };

    document.addEventListener('click', openImage);
    document.addEventListener('dblclick', openImage);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', openImage);
      document.removeEventListener('dblclick', openImage);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!image) return null;

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || 'Expanded blog image'}
      onClick={() => setImage(null)}
    >
      <button
        className="image-lightbox-close"
        type="button"
        aria-label="Close image preview"
        onClick={() => setImage(null)}
      >
        ×
      </button>
      <img
        src={image.src}
        alt={image.alt}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
