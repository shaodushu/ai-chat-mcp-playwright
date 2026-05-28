'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, TextArea, DotLoading } from 'antd-mobile';

// markdown 渲染 HTML 基础样式
const mdStyles = {
  container: {
    fontSize: 'var(--fs-body)', lineHeight: 1.7, color: 'var(--text-primary)',
  },
  p: { margin: '0.5em 0' },
  h1: { fontSize: '1.3em', fontWeight: 700, margin: '0.8em 0 0.4em' },
  h2: { fontSize: '1.15em', fontWeight: 700, margin: '0.7em 0 0.3em' },
  h3: { fontSize: '1.05em', fontWeight: 600, margin: '0.6em 0 0.3em' },
  ul: { paddingLeft: '1.2em', margin: '0.4em 0' },
  ol: { paddingLeft: '1.2em', margin: '0.4em 0' },
  li: { margin: '0.2em 0' },
  pre: {
    background: 'var(--gray-1)', padding: 'var(--sp-md)', borderRadius: 'var(--radius-sm)',
    overflowX: 'auto', fontSize: 'var(--fs-caption)', lineHeight: 1.5, margin: '0.5em 0',
  },
  code: {
    background: 'var(--gray-1)', padding: '1px 4px', borderRadius: 3,
    fontSize: '0.9em', fontFamily: 'var(--font-mono)',
  },
  blockquote: {
    borderLeft: '3px solid var(--color-primary)', paddingLeft: 'var(--sp-md)',
    margin: '0.5em 0', color: 'var(--text-secondary)',
  },
  table: { borderCollapse: 'collapse' as const, width: '100%', margin: '0.5em 0' },
  th: { border: '1px solid var(--gray-3)', padding: '6px 10px', background: 'var(--gray-1)', fontWeight: 600, textAlign: 'left' as const },
  td: { border: '1px solid var(--gray-3)', padding: '6px 10px' },
  img: { maxWidth: '100%', borderRadius: 'var(--radius-sm)' },
  a: { color: 'var(--color-primary)', textDecoration: 'underline' },
  hr: { border: 'none', borderTop: '1px solid var(--gray-3)', margin: '1em 0' },
};

interface ChatStepProps {
  platform: string;
  onBack: () => void;
  onLogout: () => void;
}

export default function ChatStep({ platform, onBack, onLogout }: ChatStepProps) {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [streamingHtml, setStreamingHtml] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string; html?: boolean }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
  }, [history, streamingText]);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setStreamingText('');
    setStreamingHtml(false);
    setHistory(h => [...h, { role: 'user', text }]);
    setPrompt('');

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulatedText = '';
    let isHtmlContent = false;

    try {
      const res = await fetch(`/api/${platform}/chat?stream=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, timeout: 180000, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '请求失败' }));
        setError(errData.error || `HTTP ${res.status}`);
        setHistory(h => h.slice(0, -1));
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('无法读取响应流');
        setHistory(h => h.slice(0, -1));
        setSending(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
              } else {
                if (data.html) isHtmlContent = true;
                if (data.complete) {
                  accumulatedText = data.text || accumulatedText;
                  setStreamingText(accumulatedText);
                  setStreamingHtml(isHtmlContent);
                } else if (data.text) {
                  accumulatedText = data.text;
                  setStreamingText(accumulatedText);
                  setStreamingHtml(isHtmlContent);
                }
              }
            } catch { /* skip malformed */ }
          }
        }
      }

      // 处理 buffer 中剩余数据
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.complete || data.text) {
            accumulatedText = data.text || accumulatedText;
          }
        } catch { /* skip */ }
      }

      // 添加到历史
      if (accumulatedText) {
        setHistory(h => [...h, { role: 'ai', text: accumulatedText, html: isHtmlContent }]);
      }
      setStreamingText('');
      setStreamingHtml(false);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : '网络错误';
      setError(msg);
      setHistory(h => h.slice(0, -1));
    } finally {
      setSending(false);
      setStreamingText('');
      abortRef.current = null;
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
              whiteSpace: msg.html ? 'normal' : 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: 'var(--shadow-card)',
              overflow: 'auto',
            }}>
              {msg.html ? (
                <div className="ai-html-content" dangerouslySetInnerHTML={{ __html: msg.text }} />
              ) : (
                msg.text
              )}
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
              fontSize: 'var(--fs-body)', lineHeight: 1.6,
              whiteSpace: streamingHtml ? 'normal' : 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'auto',
            }}>
              {streamingText ? (
                streamingHtml ? <div className="ai-html-content" dangerouslySetInnerHTML={{ __html: streamingText }} /> : streamingText
              ) : (
                <DotLoading color="primary" />
              )}
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
      <style>{`
.ai-html-content { font-size: var(--fs-body); line-height: 1.7; color: var(--text-primary); }
.ai-html-content p { margin: 0.5em 0; }
.ai-html-content h1 { font-size: 1.3em; font-weight: 700; margin: 0.8em 0 0.4em; }
.ai-html-content h2 { font-size: 1.15em; font-weight: 700; margin: 0.7em 0 0.3em; }
.ai-html-content h3 { font-size: 1.05em; font-weight: 600; margin: 0.6em 0 0.3em; }
.ai-html-content ul, .ai-html-content ol { padding-left: 1.2em; margin: 0.4em 0; }
.ai-html-content li { margin: 0.2em 0; }
.ai-html-content pre { background: var(--gray-1); padding: var(--sp-md); border-radius: var(--radius-sm); overflow-x: auto; font-size: var(--fs-caption); line-height: 1.5; margin: 0.5em 0; }
.ai-html-content code { background: var(--gray-1); padding: 1px 4px; border-radius: 3px; font-size: 0.9em; font-family: var(--font-mono); }
.ai-html-content blockquote { border-left: 3px solid var(--color-primary); padding-left: var(--sp-md); margin: 0.5em 0; color: var(--text-secondary); }
.ai-html-content table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.ai-html-content th, .ai-html-content td { border: 1px solid var(--gray-3); padding: 6px 10px; }
.ai-html-content th { background: var(--gray-1); font-weight: 600; text-align: left; }
.ai-html-content img { max-width: 100%; border-radius: var(--radius-sm); }
.ai-html-content a { color: var(--color-primary); text-decoration: underline; }
.ai-html-content hr { border: none; border-top: 1px solid var(--gray-3); margin: 1em 0; }
.ai-html-content .ai-answer-content { }
.ai-html-content .ai-sources { margin-top: var(--sp-lg); padding-top: var(--sp-md); border-top: 1px solid var(--gray-3); }
.ai-html-content .source-icon-list { display: flex; gap: 4px; align-items: center; margin-bottom: var(--sp-sm); }
.ai-html-content .source-icon-list img { width: 20px; height: 20px; border-radius: 2px; }
.ai-html-content .source-text { font-size: var(--fs-caption); color: var(--text-secondary); }
`}</style>

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
