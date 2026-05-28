'use client';

import { useEffect, useRef, useState } from 'react';
import '@/styles/theme.css';

const VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const bodyRef = useRef<HTMLBodyElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-prefers-color-scheme', theme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      const gsap = (await import('gsap')).default;
      if (bodyRef.current) {
        gsap.to(bodyRef.current, { opacity: 1, duration: 0.6, ease: 'power2.out' });
      }
    };
    init();
  }, []);

  const toggleTheme = async () => {
    const gsap = (await import('gsap')).default;
    setTheme(t => t === 'light' ? 'dark' : 'light');
    gsap.to('#theme-toggle', {
      rotation: '+=360', scale: 1.2, duration: 0.5, ease: 'back.out(2)',
      onComplete: () => gsap.set('#theme-toggle', { clearProps: 'transform' }),
    });
  };

  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content={VIEWPORT} />
        <title>AI 对话平台</title>
      </head>
      <body ref={bodyRef} style={{ position: 'relative', overflowX: 'hidden' }}>
        {children}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 999,
            width: 44, height: 44, borderRadius: 22, border: 'none',
            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
            fontSize: 20, cursor: 'pointer', boxShadow: 'var(--shadow-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0,
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </body>
    </html>
  );
}
