'use client';

import { useEffect, useRef } from 'react';
import { Button, SpinLoading } from 'antd-mobile';

interface LoginStepProps {
  platform: string;
  onPlatformChange: (p: string) => void;
  onLogin: () => void;
  onCheckStatus: () => void;
  logging: boolean;
  checking: boolean;
  loggedIn: boolean;
  loginMessage: string;
  statusMessage: string;
}

const PLATFORMS: { key: string; label: string; url: string }[] = [
  { key: 'kimi', label: 'Kimi', url: 'kimi.com' },
  { key: 'deepseek', label: 'DeepSeek', url: 'chat.deepseek.com' },
  { key: 'doubao', label: '豆包', url: 'doubao.com' },
  { key: 'qwen', label: '千问', url: 'tongyi.aliyun.com' },
  { key: 'yuanbao', label: '元宝', url: 'yuanbao.tencent.com' },
  { key: 'zhipu', label: '智谱', url: 'chatglm.cn' },
];

export default function LoginStep({
  platform, onPlatformChange, onLogin, onCheckStatus,
  logging, checking, loggedIn, loginMessage, statusMessage,
}: LoginStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const gsap = (await import('gsap')).default;
      if (containerRef.current) {
        gsap.from(containerRef.current, {
          y: 40, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity',
        });
      }
    };
    init();
  }, []);

  return (
    <div ref={containerRef} style={{ padding: 'var(--sp-xl)' }}>
      <h2 style={{ fontSize: 'var(--fs-heading)', marginBottom: 'var(--sp-lg)' }}>选择平台</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-xl)' }}>
        {PLATFORMS.map(p => (
          <div
            key={p.key}
            onClick={() => onPlatformChange(p.key)}
            style={{
              flex: '1 1 calc(33% - 8px)', minWidth: 80,
              padding: 'var(--sp-md) var(--sp-sm)', borderRadius: 'var(--radius-md)',
              textAlign: 'center', cursor: 'pointer',
              background: platform === p.key ? 'var(--color-primary)' : 'var(--bg-card)',
              color: platform === p.key ? '#fff' : 'var(--text-primary)',
              boxShadow: 'var(--shadow-card)', transition: 'var(--transition-fast)',
              border: platform === p.key ? 'none' : '1px solid var(--gray-2)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-subhead)' }}>{p.label}</div>
            <div style={{ fontSize: 'var(--fs-caption)', opacity: 0.7, marginTop: 2 }}>{p.url}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-lg)', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-md)' }}>
          <Button
            color="primary"
            loading={logging}
            onClick={onLogin}
            style={{ flex: 1 }}
            size="large"
            disabled={logging}
          >
            {loggedIn ? '重新登录' : '打开浏览器登录'}
          </Button>
          <Button
            loading={checking}
            onClick={onCheckStatus}
            style={{ flex: 1 }}
            size="large"
            disabled={checking || !logging}
          >
            检测登录状态
          </Button>
        </div>

        {loginMessage && (
          <div style={{
            padding: 'var(--sp-md)', borderRadius: 'var(--radius-sm)',
            background: loginMessage.includes('已登录') ? 'var(--color-success-bg)' : 'var(--color-primary-bg)',
            color: loginMessage.includes('已登录') ? 'var(--color-success)' : 'var(--color-primary)',
            fontSize: 'var(--fs-body)', lineHeight: 1.6,
          }}>
            {loginMessage}
          </div>
        )}

        {statusMessage && (
          <div style={{
            marginTop: 'var(--sp-sm)', fontSize: 'var(--fs-body)',
            color: statusMessage.includes('已登录') ? 'var(--color-success)' : 'var(--text-secondary)',
          }}>
            {statusMessage}
          </div>
        )}

        {loggedIn && (
          <div style={{
            marginTop: 'var(--sp-md)', textAlign: 'center',
            color: 'var(--color-success)', fontSize: 'var(--fs-subhead)', fontWeight: 600,
          }}>
            ✓ 已登录，可以开始对话
          </div>
        )}
      </div>
    </div>
  );
}
