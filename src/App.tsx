import React, { useState, useEffect, useRef } from 'react';
import { Poem, UserState } from './types';
import Sidebar from './components/Sidebar';
import PoemDetail from './components/PoemDetail';
import Toast from './components/Toast';
import { PanelLeftOpen } from 'lucide-react';
import { POEMS, VOLUMES, TOTAL } from './data/poems';

const EMPTY_STATE: UserState = { counts: {}, notes: {}, favorites: {} };

function readLocalState(): UserState {
  try {
    const raw = localStorage.getItem('wangwei_user_state');
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeLocalState(state: UserState) {
  localStorage.setItem('wangwei_user_state', JSON.stringify(state));
}

export default function App() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [volumes, setVolumes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPoem, setCurrentPoem] = useState<Poem | null>(null);
  const [userState, setUserState] = useState<UserState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  // Responsive state: in mobile view, we track whether we are showing detail view
  const [showDetailInMobile, setShowDetailInMobile] = useState(false);

  // Sidebar collapsed state for desktop view
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Invisible file input ref for JSON imports
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        let poemsData = { poems: POEMS, volumes: VOLUMES, total: TOTAL };
        let stateData = readLocalState();
        try {
          const [poemsRes, stateRes] = await Promise.all([fetch('/api/poems'), fetch('/api/state')]);
          if (poemsRes.ok) poemsData = await poemsRes.json();
          if (stateRes.ok) stateData = await stateRes.json();
        } catch {
          // GitHub Pages has no Express API; bundled data and local storage are the fallback.
        }
        setPoems(poemsData.poems || []);
        setVolumes(poemsData.volumes || []);
        setTotal(poemsData.total || 0);
        setUserState(stateData || EMPTY_STATE);
        const lastActiveId = localStorage.getItem('last_active_poem_id');
        const matched = poemsData.poems.find((p: Poem) => p.id === lastActiveId);
        setCurrentPoem(matched || poemsData.poems[0] || null);
      } catch (e) {
        console.error("Error loading application data:", e);
        // Clean local fallback
        triggerToast("加载数据失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save selected poem ID locally to stay at the same location on refresh
  useEffect(() => {
    if (currentPoem) {
      localStorage.setItem('last_active_poem_id', currentPoem.id);
    }
  }, [currentPoem]);

  // Update read counter (local + backend update)
  const handleUpdateCount = async (poemId: string, delta: number) => {
    const currentCount = userState.counts[poemId] || 0;
    const nextCount = Math.max(0, currentCount + delta);

    const updatedCounts = {
      ...userState.counts,
      [poemId]: nextCount
    };

    const nextState = {
      ...userState,
      counts: updatedCounts
    };

    setUserState(nextState);
    writeLocalState(nextState);

    // Persist to backend server
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: { [poemId]: nextCount } })
      });
      if (delta > 0) {
        triggerToast("朗读计数 ＋1");
      } else if (delta < 0) {
        triggerToast("朗读计数 －1");
      }
    } catch (err) {
      console.error("Failed to save read count on server", err);
    }
  };

  // Save user customized notes (local + backend update)
  const handleSaveNote = async (poemId: string, noteText: string) => {
    const updatedNotes = {
      ...userState.notes,
      [poemId]: noteText
    };

    const nextState = {
      ...userState,
      notes: updatedNotes
    };

    setUserState(nextState);
    writeLocalState(nextState);

    // Persist to backend server
    try {
      await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: { [poemId]: noteText } }) });
    } catch {
      // Local storage remains the persistence layer on GitHub Pages.
    }
  };

  // Toggle favorite (local + backend update)
  const handleToggleFavorite = async (poemId: string) => {
    const currentFav = !!(userState.favorites && userState.favorites[poemId]);
    const nextFav = !currentFav;

    const updatedFavorites = {
      ...(userState.favorites || {}),
      [poemId]: nextFav
    };

    const nextState = {
      ...userState,
      favorites: updatedFavorites
    };

    setUserState(nextState);
    writeLocalState(nextState);

    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: { [poemId]: nextFav } })
      });
      if (nextFav) {
        triggerToast("已保存到我的收藏");
      } else {
        triggerToast("已取消收藏");
      }
    } catch (err) {
      console.error("Failed to save favorite on server", err);
    }
  };

  // Select poem (updates current active state and enters details view for mobile screen layouts)
  const handleSelectPoem = (poem: Poem) => {
    setCurrentPoem(poem);
    setShowDetailInMobile(true);
  };

  // Return to lists (only relevant in mobile mode)
  const handleGoBack = () => {
    setShowDetailInMobile(false);
  };

  // Export state to a client side download JSON file
  const handleExportJSON = () => {
    // Keep the map fields for backwards compatibility, and include a complete
    // per-poem record so zero-count and empty-note poems are preserved too.
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      poems: poems.map((poem) => ({
        id: poem.id,
        title: poem.title,
        count: userState.counts[poem.id] || 0,
        note: userState.notes[poem.id] || ''
      })),
      counts: userState.counts,
      notes: userState.notes,
      favorites: userState.favorites || {}
    };
    const raw = JSON.stringify(exportData, null, 2);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "wangwei_poems_state.json";
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("数据已导出为 JSON 文件");
  };

  // Trigger file import dialogue click
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle selected JSON file and merge imports on client + backend
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const importedData = JSON.parse(text);

        if (!importedData || typeof importedData !== 'object') {
          throw new Error("Invalid structure");
        }

        const importedCounts = { ...(importedData.counts || {}) } as Record<string, number>;
        const importedNotes = { ...(importedData.notes || {}) } as Record<string, string>;

        // New exports carry a complete list of poem records. Merge these into
        // the legacy maps so both formats can be imported safely.
        if (Array.isArray(importedData.poems)) {
          importedData.poems.forEach((record: unknown) => {
            if (!record || typeof record !== 'object') return;
            const item = record as { id?: unknown; count?: unknown; note?: unknown };
            if (typeof item.id !== 'string' || !item.id) return;
            if (typeof item.count === 'number' && Number.isFinite(item.count)) {
              importedCounts[item.id] = Math.max(0, item.count);
            }
            if (typeof item.note === 'string') {
              importedNotes[item.id] = item.note;
            }
          });
        }

        if (Object.keys(importedCounts).length === 0 && Object.keys(importedNotes).length === 0 && !importedData.favorites) {
          throw new Error("Invalid structure");
        }

        const confirmImport = window.confirm("导入将合并或覆盖当前的朗读、备注和收藏数据，确认导入？");
        if (!confirmImport) return;

        const mergedCounts = { ...userState.counts, ...importedCounts };
        const mergedNotes = { ...userState.notes, ...importedNotes };
        const mergedFavorites = { ...(userState.favorites || {}), ...(importedData.favorites || {}) };

        const nextState = {
          counts: mergedCounts,
          notes: mergedNotes,
          favorites: mergedFavorites
        };

        // Upload to server side persistence
        writeLocalState(nextState);
        setUserState(nextState);
        try {
          await fetch('/api/state/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextState) });
        } catch {
          // Import is already complete in local storage for static deployments.
        }
        triggerToast("成功导入并合并数据！");
      } catch (err) {
        alert("无效的导入 JSON 文件！");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input to allow re-upload
  };

  if (loading) {
    return (
      <div className="empty" style={{ fontSize: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span>正在载入王维律诗全集…</span>
        <span style={{ fontSize: '14px', color: '#8a7f6d' }}>数据将安全存放在服务端与本机浏览器中</span>
      </div>
    );
  }

  return (
    <div className={`app app-container ${showDetailInMobile ? 'show-detail' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="app">
      <Sidebar
        poems={poems}
        volumes={volumes}
        total={total}
        currentPoem={currentPoem}
        userState={userState}
        onSelectPoem={handleSelectPoem}
        onExport={handleExportJSON}
        onImport={handleImportClick}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className="main-content" id="mainContent" style={{ position: 'relative' }}>
        {isSidebarCollapsed && (
          <button 
            className="floating-expand-btn" 
            onClick={() => setIsSidebarCollapsed(false)}
            title="展开目录"
            aria-label="展开目录"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        {currentPoem ? (
          <PoemDetail
            poem={currentPoem}
            userState={userState}
            onUpdateCount={handleUpdateCount}
            onSaveNote={handleSaveNote}
            onToggleFavorite={handleToggleFavorite}
            onGoBack={handleGoBack}
            showToast={triggerToast}
          />
        ) : (
          <div className="empty">请在左侧选择一首律诗开始阅读。</div>
        )}
      </main>

      {/* Hidden file selector for JSON import */}
      <input
        type="file"
        id="importFile"
        accept=".json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
