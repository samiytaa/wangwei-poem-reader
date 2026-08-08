import React, { useState, useEffect, useRef } from 'react';
import { Poem, UserState } from '../types';
import CollapsibleSection from './CollapsibleSection';
import { 
  ChevronLeft, Plus, Minus, Copy, FilePenLine, 
  PanelLeftClose, PanelLeftOpen, Check, Save, Star, Type, ChevronUp, ChevronDown
} from 'lucide-react';

interface PoemDetailProps {
  poem: Poem;
  userState: UserState;
  onUpdateCount: (poemId: string, delta: number) => void;
  onSaveNote: (poemId: string, noteText: string) => Promise<void>;
  onToggleFavorite: (poemId: string) => void;
  onGoBack: () => void;
  showToast: (msg: string) => void;
}

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟";

export default function PoemDetail({
  poem,
  userState,
  onUpdateCount,
  onSaveNote,
  onToggleFavorite,
  onGoBack,
  showToast
}: PoemDetailProps) {
  const [noteText, setNoteText] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showFontPopover, setShowFontPopover] = useState(false);
  const noteEditorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(() => {
    const savedSize = localStorage.getItem('poem_font_size_px');
    if (savedSize) {
      const parsedSize = Number(savedSize);
      if (parsedSize >= 16 && parsedSize <= 36) return parsedSize;
    }

    const legacySize = localStorage.getItem('poem_font_size');
    return legacySize === 'small' ? 18 : legacySize === 'large' ? 28 : 23;
  });

  const handleFontSizeChange = (value: string) => {
    const nextSize = Number(value);
    setFontSize(nextSize);
    localStorage.setItem('poem_font_size_px', String(nextSize));
  };

  // Sync internal state with prop changes
  useEffect(() => {
    setNoteText(userState.notes[poem.id] || '');
    setSaveStatus('');
  }, [poem.id, userState.notes]);

  // Start each poem with its notes panel collapsed.
  useEffect(() => {
    setShowNoteEditor(false);
  }, [poem.id]);

  const count = userState.counts[poem.id] || 0;
  const meta = [poem.volume, poem.group].filter(Boolean).join(" · ");
  const hasNote = noteText.trim().length > 0;
  const isFavorited = !!(userState.favorites && userState.favorites[poem.id]);

  // Helper to parse line with circle annotation tooltips
  const renderLineWithCollation = (line: string) => {
    const elements: React.ReactNode[] = [];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (CIRCLED.includes(ch) && poem.collation && poem.collation[ch]) {
        elements.push(
          <sup key={i} className="fn" title={`校：${poem.collation[ch]}`}>
            {ch}
          </sup>
        );
      } else {
        elements.push(ch);
      }
    }
    return elements;
  };

  // Plain version for clipboard copy
  const getPlainLineText = (line: string) => {
    let out = "";
    for (const ch of line) {
      if (!CIRCLED.includes(ch)) {
        out += ch;
      }
    }
    return out;
  };

  // Copy feature matching original implementation
  const handleCopy = async () => {
    const lines: string[] = [];
    lines.push(poem.title);
    if (meta) lines.push(meta);
    lines.push("");
    lines.push("【内容】");
    poem.body.forEach(l => lines.push("　　" + getPlainLineText(l)));
    if (poem.annotations && poem.annotations.length) {
      lines.push("");
      lines.push("【注释】");
      poem.annotations.forEach(a => {
        lines.push("　　" + (a.term ? a.term + "：" + a.text : a.text));
      });
    }

    const fullText = lines.join("\n");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText);
        showToast("已复制：标题 / 内容 / 注释");
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        ta.style.top = "0";
        ta.style.left = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) {
          showToast("已复制：标题 / 内容 / 注释");
        } else {
          throw new Error("execCommand copy failed");
        }
      }
    } catch (e) {
      showToast("复制失败，请手动选择");
    }
  };

  const handleSave = async () => {
    try {
      await onSaveNote(poem.id, noteText);
      setSaveStatus("已保存 ✓");
      setTimeout(() => setSaveStatus(''), 1500);
    } catch (e) {
      setSaveStatus("保存失败 ✗");
    }
  };

  return (
    <div className="main-content-inner">
      {/* Top single-line toolbar navigation area */}
      <div className="toolbar">
        <div className="toolbar-left">
          {/* Back Button (Mobile only) */}
          <button className="toolbar-btn btn-back" id="btnBack" onClick={onGoBack} title="返回列表">
            <ChevronLeft size={16} />
            <span>列表</span>
          </button>

          {/* Simple header branding instead of active poem title */}
          <div className="title-block">
            {meta && <span className="navbar-brand">{meta}</span>}
          </div>
        </div>

        <div className="toolbar-right">
          <div className="count-display">
            已朗读 <b id="cnt">{count}</b> 遍
          </div>
          
          <div className="button-group">
            <button className="toolbar-btn primary font-medium" onClick={() => onUpdateCount(poem.id, 1)} title="已朗读一遍 ＋1">
              <Plus size={14} />
              <span>读+1</span>
            </button>
            <button className="toolbar-btn text-muted" onClick={() => onUpdateCount(poem.id, -1)} title="朗读计数 －1">
              <Minus size={14} />
            </button>
            <div className="font-size-control">
              <button
                className={`toolbar-btn font-change-btn ${showFontPopover ? 'active' : ''}`}
                onClick={() => setShowFontPopover((visible) => !visible)}
                title="调整正文字号"
                aria-label={`调整正文字号，当前 ${fontSize}px`}
                aria-expanded={showFontPopover}
                aria-controls="fontSizePopover"
              >
                <Type size={14} />
              </button>
              {showFontPopover && (
                <div className="font-size-popover" id="fontSizePopover" role="dialog" aria-label="调整正文字号">
                  <div className="font-size-popover-header">
                    <span>正文字号</span>
                    <strong>{fontSize}px</strong>
                  </div>
                  <input
                    aria-label="正文字号"
                    type="range"
                    min="16"
                    max="36"
                    step="1"
                    value={fontSize}
                    onChange={(event) => handleFontSizeChange(event.target.value)}
                  />
                  <div className="font-size-range-labels" aria-hidden="true">
                    <span>小</span>
                    <span>大</span>
                  </div>
                </div>
              )}
            </div>
            <button className="toolbar-btn" onClick={handleCopy} title="复制诗名、正文及注释" aria-label="复制诗名、正文及注释">
              <Copy size={14} />
            </button>
            <button 
              className={`toolbar-btn favorite-btn ${isFavorited ? 'active' : ''}`} 
              onClick={() => onToggleFavorite(poem.id)}
              title={isFavorited ? "取消收藏" : "加入我的收藏"}
              aria-label={isFavorited ? "取消收藏" : "加入我的收藏"}
            >
              <Star size={14} style={{ fill: isFavorited ? 'var(--accent)' : 'none', color: isFavorited ? 'var(--accent)' : 'currentColor' }} />
            </button>
            <button 
              className={`toolbar-btn note-btn ${hasNote ? 'has-note' : ''}`} 
              onClick={() => {
                setShowNoteEditor(true);
                noteEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              title="展开并定位到备注"
              aria-label="展开并定位到备注"
            >
              <FilePenLine size={14} />
              {hasNote && <span className="note-dot" />}
            </button>
          </div>
        </div>
      </div>



      <div className="content-scroll">
        {/* Main poetry title block centered directly above the body */}
        <div className="poem-title-container">
          <h1 className="poem-center-title">{poem.title}</h1>
        </div>

        {/* Main Poetry Focus Subject */}
        <div className="poem-body" style={{ '--poem-font-size': `${fontSize}px` } as React.CSSProperties}>
          {poem.body.map((line, index) => (
            <p className="line" key={index}>
              {renderLineWithCollation(line)}
            </p>
          ))}
        </div>

        {/* Notes stay directly below the poem for immediate reading and editing. */}
        <div className={`notes ${showNoteEditor ? '' : 'notes-collapsed'}`} ref={noteEditorRef}>
          <div className="notes-header">
            <h3>备注</h3>
            <button
              className="notes-toggle"
              onClick={() => setShowNoteEditor(!showNoteEditor)}
              aria-expanded={showNoteEditor}
              title={showNoteEditor ? '收起备注' : '展开备注'}
            >
              {showNoteEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{showNoteEditor ? '收起' : '展开'}</span>
            </button>
          </div>
          {showNoteEditor && (
            <>
              <textarea
                id="noteArea"
                placeholder="在此写下你的解读、背诵心得…（保存后将同步到服务器与本机）"
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setSaveStatus('');
                }}
              />
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span className={`status ${saveStatus.includes('✓') ? 'ok' : ''}`} id="noteStatus">
                  {saveStatus}
                </span>
                <button className="primary btn-save" onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Save size={13} />
                  <span>保存备注</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Additional Collapsible References (Collation) */}
        {poem.collation && (
          <CollapsibleSection title="校（异文）" defaultCollapsed={true}>
            {Object.entries(poem.collation).map(([key, val]) => {
              if (key === "·") {
                return (
                  <div className="collation-item" key={key}>
                    {val.split('\n').map((v, i) => (
                      <React.Fragment key={i}>
                        {v}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                );
              }
              return (
                <div className="collation-item" key={key}>
                  <span className="mk">{key}</span>
                  {val}
                </div>
              );
            })}
          </CollapsibleSection>
        )}

        {/* Additional Collapsible References (Annotations) */}
        {poem.annotations && poem.annotations.length > 0 && (
          <CollapsibleSection title="注" defaultCollapsed={true}>
            {poem.annotations.map((anno, idx) => (
              <div className="anno-item" key={idx}>
                {anno.term && <span className="term">{anno.term}</span>}
                {anno.text}
              </div>
            ))}
          </CollapsibleSection>
        )}
      </div>

    </div>
  );
}
