'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SpinLoading, ProgressBar } from 'antd-mobile';
import LoginStep from './components/LoginStep';
import ChatStep from './components/ChatStep';

type Step = 'login' | 'chat';

export default function Home() {
  const [step, setStep] = useState<Step>('login');
  const [platform, setPlatform] = useState('kimi');
  const [logging, setLogging] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const indicatorRef = useRef<HTMLDivElement>(null);

  // Step indicator animation
  useEffect(() => {
    const init = async () => {
      const gsap = (await import('gsap')).default;
      const dots = document.querySelectorAll('.step-dot');
      const labels = document.querySelectorAll('.step-label');
      const lines = document.querySelectorAll('.step-line');
      gsap.from(dots, { scale: 0, duration: 0.4, stagger: 0.15, ease: 'back.out(1.7)', clearProps: 'transform' });
      gsap.from(labels, { y: -10, opacity: 0, duration: 0.3, stagger: 0.1, delay: 0.2, clearProps: 'transform,opacity' });
      gsap.from(lines, { scaleX: 0, duration: 0.3, stagger: 0.1, delay: 0.3, transformOrigin: 'left center', clearProps: 'transform' });
    };
    init();
  }, [step]);

  const handleLogin = useCallback(async () => {
    setLogging(true);
    setLoginMessage('');
    setStatusMessage('');
    try {
      const res = await fetch(`/api/${platform}/launch`, { method: 'POST' });
      const data = await res.json();
      setLoginMessage(data.message || '');
      if (data.loggedIn) {
        setLoggedIn(true);
      }
    } catch (err: unknown) {
      setLoginMessage(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLogging(false);
    }
  }, [platform]);

  const handleCheckStatus = useCallback(async () => {
    setChecking(true);
    setStatusMessage('');
    try {
      const res = await fetch(`/api/${platform}/status`);
      const data = await res.json();
      if (data.loggedIn) {
        setLoggedIn(true);
        setStatusMessage('✓ 已登录');
      } else {
        setStatusMessage('未登录，请在浏览器窗口中完成登录');
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : '请求失败');
    } finally {
      setChecking(false);
    }
  }, [platform]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`/api/${platform}/logout`, { method: 'POST' });
    } catch { /* ignore */ }
    setLoggedIn(false);
    setLoginMessage('');
    setStatusMessage('');
    setStep('login');
  }, [platform]);

  const handleGoToChat = useCallback(() => {
    setStep('chat');
  }, []);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh' }}>
      {/* Step Indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-lg) var(--sp-xl) var(--sp-md)', gap: 0,
      }}>
        {[
          { key: 'login', label: '登录' },
          { key: 'chat', label: '对话' },
        ].map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                className="step-dot"
                style={{
                  width: 28, height: 28, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--fs-caption)', fontWeight: 700,
                  background: step === s.key ? 'var(--color-primary)' : 'var(--gray-2)',
                  color: '#fff', transition: 'var(--transition-fast)',
                }}
              >
                {step === s.key ? '●' : i + 1}
              </div>
              <span className="step-label" style={{
                fontSize: 'var(--fs-caption)',
                color: step === s.key ? 'var(--color-primary)' : 'var(--text-tertiary)',
                fontWeight: step === s.key ? 600 : 400,
              }}>
                {s.label}
              </span>
            </div>
            {i === 0 && (
              <div className="step-line" style={{
                width: 60, height: 2, background: step === 'chat' ? 'var(--color-primary)' : 'var(--gray-2)',
                margin: '0 var(--sp-sm)', marginBottom: 20, borderRadius: 1,
                transition: 'var(--transition-fast)',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      {step === 'login' && (
        <>
          <LoginStep
            platform={platform}
            onPlatformChange={setPlatform}
            onLogin={handleLogin}
            onCheckStatus={handleCheckStatus}
            logging={logging}
            checking={checking}
            loggedIn={loggedIn}
            loginMessage={loginMessage}
            statusMessage={statusMessage}
          />
          <div style={{ padding: '0 var(--sp-xl) var(--sp-xl)' }}>
            <button
              onClick={handleGoToChat}
              disabled={!loggedIn}
              style={{
                width: '100%', padding: 'var(--sp-md)',
                borderRadius: 'var(--radius-md)', border: 'none',
                fontSize: 'var(--fs-subhead)', fontWeight: 600,
                cursor: loggedIn ? 'pointer' : 'not-allowed',
                background: loggedIn ? 'var(--color-primary)' : 'var(--gray-2)',
                color: loggedIn ? '#fff' : 'var(--text-disabled)',
                transition: 'var(--transition-fast)',
              }}
            >
              开始对话 →
            </button>
          </div>
        </>
      )}

      {step === 'chat' && (
        <ChatStep
          platform={platform}
          onBack={() => setStep('login')}
          onLogout={handleLogout}
        />
      )}
    </main>
  );
}
