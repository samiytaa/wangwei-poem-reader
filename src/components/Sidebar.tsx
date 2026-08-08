import React, { useState } from 'react';
import { Poem, UserState } from '../types';
import { ChevronDown, ChevronRight, BookOpen, PanelLeftClose, Star, Shuffle } from 'lucide-react';

interface SidebarProps {
  poems: Poem[];
  volumes: string[];
  total: number;
  currentPoem: Poem | null;
  userState: UserState;
  onSelectPoem: (poem: Poem) => void;
  onExport: () => void;
  onImport: () => void;
  onToggleSidebar?: () => void;
}

export default function Sidebar({
  poems,
  volumes,
  total,
  currentPoem,
  userState,
  onSelectPoem,
  onExport,
  onImport,
  onToggleSidebar
}: SidebarProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedVolumes, setExpandedVolumes] = useState<Record<string, boolean>>({});

  // Helper to render badge text matching original design
  const getBadgeText = (poemId: string) => {
    const c = userState.counts[poemId] || 0;
    const note = userState.notes[poemId] || '';
    const hasNote = note.trim().length > 0;
    
    let parts = [];
    if (c > 0) parts.push(`读${c}`);
    if (hasNote) parts.push('注');
    
    return parts.join(' ');
  };

  const hasNoteBadge = (poemId: string) => {
    const note = userState.notes[poemId] || '';
    return note.trim().length > 0;
  };

  const isVolExpanded = (vol: string) => {
    if (searchKeyword.trim() !== '') return true; // Auto expand when searching
    return expandedVolumes[vol] !== false; // Default to true if not explicitly collapsed
  };

  const toggleVolume = (vol: string) => {
    setExpandedVolumes((prev) => ({
      ...prev,
      [vol]: prev[vol] === false ? true : false
    }));
  };

  let totalShown = 0;

  return (
    <aside className="sidebar">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent)' }} />
            <h1>王维五言律诗</h1>
          </div>
          {onToggleSidebar && (
            <button className="sidebar-close-btn" onClick={onToggleSidebar} title="收起目录">
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        <div className="sub" id="subInfo">
          共 {total} 首 · 数据存于本机与服务器
        </div>
      </header>
      <div className="search">
        <input
          id="searchBox"
          type="text"
          placeholder="搜索诗名…"
          autoComplete="off"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>
      <div className="sidebar-btn-row">
        <button
          id="btnRandom"
          className="sidebar-btn primary"
          style={{ flex: '2 1 0%' }}
          onClick={() => {
            if (poems.length > 0) {
              const randomIndex = Math.floor(Math.random() * poems.length);
              onSelectPoem(poems[randomIndex]);
            }
          }}
          title="随机阅读一首王维五言律诗"
        >
          <Shuffle size={15} aria-hidden="true" />
          <span>随机</span>
        </button>
        <button
          id="btnExport"
          className="sidebar-btn"
          style={{ flex: '1 1 0%' }}
          onClick={onExport}
          title="导出全部朗读记录与备注到 JSON 文件"
        >
          导出
        </button>
        <button
          id="btnImport"
          className="sidebar-btn"
          style={{ flex: '1 1 0%' }}
          onClick={onImport}
          title="从本地 JSON 文件导入数据"
        >
          导入
        </button>
      </div>
      <div className="poem-list" id="poemList">
        {/* My Favorites (我的收藏) Section */}
        {(() => {
          const favoritePoems = poems.filter((p) => userState.favorites && userState.favorites[p.id]);
          const filteredFavorites = searchKeyword
            ? favoritePoems.filter((p) => p.title.includes(searchKeyword))
            : favoritePoems;

          // If we are searching and there are no matched favorites, hide the section
          if (searchKeyword && filteredFavorites.length === 0) return null;

          const isFavExpanded = isVolExpanded('favorites_section');
          
          // Increment total shown
          totalShown += filteredFavorites.length;

          return (
            <div className="vol-group favorites-group" key="favorites_section" style={{ borderBottom: '1px dashed var(--line)', paddingBottom: '12px', marginBottom: '8px' }}>
              <div 
                className="vol-title" 
                onClick={() => toggleVolume('favorites_section')}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', fontWeight: 'bold', color: 'var(--accent)' }}>
                  <span className="vol-chevron" style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
                    {isFavExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={14} style={{ fill: 'var(--accent)', color: 'var(--accent)' }} />
                    我的收藏（{favoritePoems.length}）
                  </span>
                </div>
              </div>
              
              <div className={`vol-poems-container ${isFavExpanded ? 'expanded' : 'collapsed'}`}>
                {isFavExpanded && (
                  filteredFavorites.length === 0 ? (
                    <div style={{ padding: '6px 20px', fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                      暂无收藏诗歌
                    </div>
                  ) : (
                    filteredFavorites.map((p) => {
                      const isActive = currentPoem?.id === p.id;
                      const badgeText = getBadgeText(p.id);
                      const isNote = hasNoteBadge(p.id);

                      return (
                        <div
                          className={`poem-item ${isActive ? 'active' : ''}`}
                          key={`fav-${p.id}`}
                          onClick={() => onSelectPoem(p)}
                          style={{ borderLeft: '2px solid rgba(212, 163, 115, 0.3)' }}
                        >
                          <span className="t" style={{ fontWeight: 500 }}>
                            {p.group ? `${p.group} · ${p.title}` : p.title}
                          </span>
                          {badgeText && (
                            <span className={`badge ${isNote ? 'note' : ''}`}>
                              {badgeText}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          );
        })()}

        {volumes.map((vol) => {
          const volPoems = poems.filter((p) => p.volume === vol);
          const filteredPoems = searchKeyword
            ? volPoems.filter((p) => p.title.includes(searchKeyword))
            : volPoems;

          if (filteredPoems.length === 0) return null;

          totalShown += filteredPoems.length;
          const expanded = isVolExpanded(vol);

          return (
            <div className="vol-group" key={vol}>
              <div 
                className="vol-title" 
                onClick={() => toggleVolume(vol)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span className="vol-chevron" style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span>{vol}（{filteredPoems.length}）</span>
                </div>
              </div>
              
              <div className={`vol-poems-container ${expanded ? 'expanded' : 'collapsed'}`}>
                {expanded && filteredPoems.map((p) => {
                  const isActive = currentPoem?.id === p.id;
                  const badgeText = getBadgeText(p.id);
                  const isNote = hasNoteBadge(p.id);

                  return (
                    <div
                      className={`poem-item ${isActive ? 'active' : ''}`}
                      key={p.id}
                      onClick={() => onSelectPoem(p)}
                    >
                      <span className="t">
                        {p.group ? `${p.group} · ${p.title}` : p.title}
                      </span>
                      {badgeText && (
                        <span className={`badge ${isNote ? 'note' : ''}`}>
                          {badgeText}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {totalShown === 0 && searchKeyword && (
          <div style={{ padding: '20px', color: '#8a7f6d' }}>
            未找到「{searchKeyword}」相关诗
          </div>
        )}
      </div>
    </aside>
  );
}
