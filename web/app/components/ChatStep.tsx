'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, TextArea, SpinLoading, DotLoading } from 'antd-mobile';

interface ChatStepProps {
  platform: string;
  onBack: () => void;
  onLogout: () => void;
}

export default function ChatStep({ platform, onBack, onLogout }: ChatStepProps) {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [complete, setComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, response]);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setResponse(null);
    setHistory(h => [...h, { role: 'user', text }]);
    setPrompt('');

    try {
      const res = await fetch(`/api/${platform}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, timeout: 180000 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '请求失败');
        setHistory(h => h.slice(0, -1));
      } else {
        setResponse(data.text);
        setComplete(data.complete ?? true);
        setHistory(h => [...h, { role: 'ai', text: data.text }]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '网络错误';
      setError(msg);
      setHistory(h => h.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div ref={containerRef} style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 80px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-md)' }}>
        <Button size="small" onClick={onBack}>← 返回</Button>
        <span style={{ fontSize: 'var(--fs-title)', fontWeight: 600, flex: 1 }}>
          {platform === 'kimi' ? 'Kimi' :
           platform === 'deepseek' ? 'DeepSeek' :
           platform === 'doubao' ? '豆包' :
           platform === 'qwen' ? '千问' :
           platform === 'yuanbao' ? '元宝' :
           platform === 'zhipu' ? '智谱' : platform}
        </span>
        <Button size="small" color="default" onClick={onLogout}>退出</Button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 'var(--sp-sm) 0',
        display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)',
      }}>
        {history.length === 0 && !sending && (
          <div style={{
            textAlign: 'center', color: 'var(--text-tertiary)',
            padding: 'var(--sp-2xl) 0', fontSize: 'var(--fs-body)',
          }}>
            输入你的问题，开始与 AI 对话
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%', padding: 'var(--sp-md) var(--sp-lg)',
              borderRadius: msg.role === 'user' ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
              background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-card)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              fontSize: 'var(--fs-body)', lineHeight: 1.6,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              boxShadow: 'var(--shadow-card)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: 'var(--sp-md) var(--sp-lg)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <DotLoading color="primary" />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 'var(--sp-md)', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
            fontSize: 'var(--fs-body)', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div ref={listEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 'var(--sp-sm)', alignItems: 'flex-end',
        paddingTop: 'var(--sp-sm)',
        borderTop: '1px solid var(--gray-2)',
      }}>
        <TextArea
          value={prompt}
          onChange={v => setPrompt(v)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          rows={2}
          autoSize={{ minRows: 2, maxRows: 6 }}
          style={{
            flex: 1, borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)', padding: 'var(--sp-sm) var(--sp-md)',
            fontSize: 'var(--fs-body)', border: '1px solid var(--gray-3)',
          }}
        />
        <Button
          color="primary"
          onClick={handleSend}
          loading={sending}
          disabled={!prompt.trim() || sending}
          style={{ height: 44, minWidth: 70, borderRadius: 'var(--radius-md)' }}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
