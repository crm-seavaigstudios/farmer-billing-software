"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetNotes, apiSaveNote, apiDeleteNote, AgencyNote } from '@/lib/api';
import {
  StickyNote,
  Plus,
  Search,
  CheckSquare,
  Square,
  List,
  Table as TableIcon,
  Trash2,
  Pin,
  Sparkles,
  Save,
  Clock,
  Printer,
  FileText,
  Tag,
  ChevronDown,
  Check,
  PlusCircle,
  X,
  Maximize2,
  Minimize2,
  Share2,
  Layers,
  CheckCircle2
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', labelEn: 'All Notes', labelMr: 'सर्व नोंदी' },
  { id: 'GENERAL', labelEn: 'General Diary', labelMr: 'दैनंदिन डायरी' },
  { id: 'FARMER', labelEn: 'Farmer Follow-up', labelMr: 'शेतकरी फॉलोअप' },
  { id: 'LOGISTICS', labelEn: 'Logistics & Transport', labelMr: 'वाहतूक व गाड्या' },
  { id: 'ACCOUNTS', labelEn: 'Accounts & Payments', labelMr: 'हिशोब व पेमेंट' },
  { id: 'IMPORTANT', labelEn: 'Urgent & Important', labelMr: 'अति महत्वाचे' },
];

const COLORS = [
  { name: 'White', bg: 'bg-white', border: 'border-slate-200', hex: '#ffffff', cardBg: '#ffffff' },
  { name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-300', hex: '#fef3c7', cardBg: '#fffbeb' },
  { name: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-300', hex: '#d1fae5', cardBg: '#ecfdf5' },
  { name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-300', hex: '#dbeafe', cardBg: '#eff6ff' },
  { name: 'Purple', bg: 'bg-purple-50', border: 'border-purple-300', hex: '#f3e8ff', cardBg: '#faf5ff' },
  { name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-300', hex: '#ffe4e6', cardBg: '#fff1f2' },
];

export default function NotesPage() {
  const { t, language } = useLanguage();
  const [notes, setNotes] = useState<AgencyNote[]>([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<AgencyNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // New item inputs inside editor
  const [newCheckText, setNewCheckText] = useState('');
  const [newBulletText, setNewBulletText] = useState('');

  useEffect(() => {
    async function loadNotes() {
      const data = await apiGetNotes();
      setNotes(data);
    }
    loadNotes();
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesCat = activeCategory === 'ALL' || n.category === activeCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = n.title?.toLowerCase().includes(q);
      const inContent = n.content?.toLowerCase().includes(q);
      const inItems = n.items?.some((it) => it.text.toLowerCase().includes(q));
      const inBullets = n.bullets?.some((b) => b.toLowerCase().includes(q));
      const inTable = n.tableData?.rows?.some((r) => r.some((c) => c.toLowerCase().includes(q)));

      return inTitle || inContent || inItems || inBullets || inTable;
    });
  }, [notes, activeCategory, searchQuery]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  const handleCreateNewNote = async () => {
    const newNote: AgencyNote = {
      id: `note-${Date.now()}`,
      title: '',
      category: activeCategory === 'ALL' ? 'GENERAL' : (activeCategory as any),
      content: '',
      items: [],
      bullets: [],
      tableData: {
        headers: ['तपशील (Item)', 'संख्या / वजन', 'दर (Rate)', 'एकूण (Total)'],
        rows: [['', '', '', '']]
      },
      isPinned: false,
      color: '#ffffff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingNote(newNote);
    setIsEditorOpen(true);
  };

  const handleOpenNote = (note: AgencyNote) => {
    setEditingNote({ ...note });
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (noteToSave?: AgencyNote) => {
    const target = noteToSave || editingNote;
    if (!target) return;
    setIsSaving(true);
    try {
      const finalNote = {
        ...target,
        title: target.title.trim() || (language === 'mr' ? 'नवीन नोंद' : 'Untitled Note'),
        updatedAt: new Date().toISOString()
      };
      const saved = await apiSaveNote(finalNote);
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setEditingNote(saved);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(language === 'mr' ? 'ही नोंद कायमची हटवायची आहे का?' : 'Are you sure you want to delete this note?')) return;
    await apiDeleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNote?.id === id) {
      setIsEditorOpen(false);
      setEditingNote(null);
    }
  };

  const togglePin = async (e: React.MouseEvent, note: AgencyNote) => {
    e.stopPropagation();
    const updated = { ...note, isPinned: !note.isPinned };
    const saved = await apiSaveNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
    if (editingNote?.id === note.id) setEditingNote(saved);
  };

  // Checklist Actions
  const addCheckItem = () => {
    if (!newCheckText.trim() || !editingNote) return;
    const newItem = { id: `item-${Date.now()}`, text: newCheckText.trim(), done: false };
    const updated = { ...editingNote, items: [...(editingNote.items || []), newItem] };
    setEditingNote(updated);
    setNewCheckText('');
    handleSaveNote(updated);
  };

  const toggleCheckItem = (itemId: string) => {
    if (!editingNote) return;
    const updated = {
      ...editingNote,
      items: (editingNote.items || []).map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
    };
    setEditingNote(updated);
    handleSaveNote(updated);
  };

  const removeCheckItem = (itemId: string) => {
    if (!editingNote) return;
    const updated = {
      ...editingNote,
      items: (editingNote.items || []).filter((it) => it.id !== itemId)
    };
    setEditingNote(updated);
    handleSaveNote(updated);
  };

  // Bullet Actions
  const addBullet = () => {
    if (!newBulletText.trim() || !editingNote) return;
    const updated = { ...editingNote, bullets: [...(editingNote.bullets || []), newBulletText.trim()] };
    setEditingNote(updated);
    setNewBulletText('');
    handleSaveNote(updated);
  };

  const removeBullet = (index: number) => {
    if (!editingNote) return;
    const updated = {
      ...editingNote,
      bullets: (editingNote.bullets || []).filter((_, i) => i !== index)
    };
    setEditingNote(updated);
    handleSaveNote(updated);
  };

  // Table Actions
  const addTableRow = () => {
    if (!editingNote) return;
    const currentTable = editingNote.tableData || { headers: ['Item', 'Qty', 'Rate', 'Total'], rows: [] };
    const numCols = currentTable.headers?.length || 4;
    const updated = {
      ...editingNote,
      tableData: {
        ...currentTable,
        rows: [...currentTable.rows, Array(numCols).fill('')]
      }
    };
    setEditingNote(updated);
    handleSaveNote(updated);
  };

  const removeTableRow = (rowIndex: number) => {
    if (!editingNote || !editingNote.tableData) return;
    const updated = {
      ...editingNote,
      tableData: {
        ...editingNote.tableData,
        rows: editingNote.tableData.rows.filter((_, idx) => idx !== rowIndex)
      }
    };
    setEditingNote(updated);
    handleSaveNote(updated);
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!editingNote || !editingNote.tableData) return;
    const updatedRows = editingNote.tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const newRow = [...row];
      newRow[colIndex] = value;
      return newRow;
    });
    const updated = {
      ...editingNote,
      tableData: {
        ...editingNote.tableData,
        rows: updatedRows
      }
    };
    setEditingNote(updated);
  };

  const updateTableHeader = (colIndex: number, value: string) => {
    if (!editingNote || !editingNote.tableData) return;
    const updatedHeaders = [...editingNote.tableData.headers];
    updatedHeaders[colIndex] = value;
    const updated = {
      ...editingNote,
      tableData: {
        ...editingNote.tableData,
        headers: updatedHeaders
      }
    };
    setEditingNote(updated);
  };

  const addTableColumn = () => {
    if (!editingNote) return;
    const currentTable = editingNote.tableData || { headers: ['Item', 'Qty', 'Rate', 'Total'], rows: [] };
    const updated = {
      ...editingNote,
      tableData: {
        headers: [...currentTable.headers, `स्तंभ ${currentTable.headers.length + 1}`],
        rows: currentTable.rows.map((row) => [...row, ''])
      }
    };
    setEditingNote(updated);
    handleSaveNote(updated);
  };

  const renderNoteCard = (note: AgencyNote) => {
    const completedTasks = note.items?.filter((i) => i.done).length || 0;
    const totalTasks = note.items?.length || 0;
    const bulletsCount = note.bullets?.length || 0;
    const tableRowsCount = note.tableData?.rows?.filter((r) => r.some((c) => c.trim() !== '')).length || 0;

    return (
      <div
        key={note.id}
        onClick={() => handleOpenNote(note)}
        style={{ backgroundColor: note.color || '#ffffff' }}
        className="group relative rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          {/* Header & Pin */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-black text-slate-900 line-clamp-1">
              {note.title || (language === 'mr' ? 'नवीन नोंद' : 'Untitled Note')}
            </h3>
            <button
              onClick={(e) => togglePin(e, note)}
              className={`p-1.5 rounded-lg hover:bg-black/5 transition-colors ${
                note.isPinned ? 'text-amber-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'
              }`}
              title={note.isPinned ? 'Unpin' : 'Pin note'}
            >
              <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-amber-500 rotate-45' : ''}`} />
            </button>
          </div>

          {/* Note Content Text */}
          {note.content && (
            <p className="text-xs font-semibold text-slate-700 line-clamp-3 mb-3 whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          )}

          {/* Checklist Snippet Preview */}
          {totalTasks > 0 && (
            <div className="space-y-1 mb-3 bg-white/70 rounded-xl p-2.5 border border-black/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                ✅ {language === 'mr' ? 'चेकलिस्ट' : 'Tasks'} ({completedTasks}/{totalTasks})
              </span>
              {note.items?.slice(0, 3).map((it) => (
                <div key={it.id} className="flex items-center gap-1.5 text-xs text-slate-800">
                  <span className={it.done ? 'text-emerald-600' : 'text-slate-400'}>
                    {it.done ? '☑' : '☐'}
                  </span>
                  <span className={`line-clamp-1 ${it.done ? 'line-through text-slate-400 font-medium' : 'font-bold'}`}>
                    {it.text}
                  </span>
                </div>
              ))}
              {totalTasks > 3 && (
                <span className="text-[10px] text-slate-400 font-bold block pt-0.5">
                  +{totalTasks - 3} {language === 'mr' ? 'इतर कामे...' : 'more items...'}
                </span>
              )}
            </div>
          )}

          {/* Bullets Snippet Preview */}
          {bulletsCount > 0 && (
            <div className="space-y-1 mb-3">
              {note.bullets?.slice(0, 2).map((b, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="line-clamp-1">{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table Snippet Preview */}
          {tableRowsCount > 0 && (
            <div className="bg-white/80 border border-black/5 rounded-xl p-2 mb-2 flex items-center gap-1.5 text-xs font-bold text-purple-800">
              <TableIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>{tableRowsCount} {language === 'mr' ? 'ओळींचा हिशोब तक्ता' : 'Table Rows Included'}</span>
            </div>
          )}
        </div>

        {/* Footer Badges */}
        <div className="flex items-center justify-between pt-3 border-t border-black/5 mt-2 text-[11px] font-bold text-slate-500">
          <span className="px-2 py-0.5 rounded-md bg-black/5 text-slate-800 font-black">
            {CATEGORIES.find((c) => c.id === note.category)?.[language === 'mr' ? 'labelMr' : 'labelEn'] || note.category}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium">
              {new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
              })}
            </span>
            <button
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Main Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shadow-xs">
                <StickyNote className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {language === 'mr' ? 'एजन्सी नोंदी व डिजिटल डायरी' : 'Agency Notes & Digital Diary'}
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {notes.length} {language === 'mr' ? 'नोंदी' : 'Notes'}
                  </span>
                </h1>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {language === 'mr'
                    ? 'गुगल कीप प्रमाणे सर्व दैनंदिन कामांच्या चेकलिस्ट, शेतकऱ्यांच्या नोंदी आणि हिशोबांचे तक्ते जतन करा.'
                    : 'Google Keep & Notion style digital diary with checklists, bullet points, and spreadsheet tables.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNewNote}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'mr' ? '+ नवीन नोंद बनवा' : '+ Create Note'}</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Category Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'नोंदींमध्ये शोधा (शीर्षक, चेकलिस्ट, तक्ता)...' : 'Search notes, tasks, tables...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-800"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'mr' ? cat.labelMr : cat.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-amber-500 rotate-45" />
                <span>{language === 'mr' ? 'महत्वाच्या पिन केलेल्या नोंदी (Pinned Notes)' : 'Pinned Notes'}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}

          {/* All Other Notes Grid */}
          <div className="space-y-3">
            {pinnedNotes.length > 0 && (
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {language === 'mr' ? 'इतर नोंदी (Other Notes)' : 'All Notes'}
              </h2>
            )}

            {filteredNotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <StickyNote className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  {language === 'mr' ? 'कोणतीही नोंद आढळली नाही' : 'No Notes Found'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1 mb-4">
                  {language === 'mr' ? 'नवीन कामांची चेकलिस्ट किंवा डायरी नोंद करण्यासाठी खालील बटण दाबा.' : 'Create your first note with checklists, bullet points or tables.'}
                </p>
                <button
                  onClick={handleCreateNewNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {language === 'mr' ? '+ नवीन नोंद बनवा' : '+ Create Note'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {otherNotes.map(renderNoteCard)}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* FULL-SCREEN / SPACIOUS NOTION-STYLE DOCUMENT EDITOR MODAL */}
      {isEditorOpen && editingNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div
            style={{ backgroundColor: editingNote.color || '#ffffff' }}
            className="w-full max-w-4xl h-[92vh] rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-sans"
          >
            {/* Editor Toolbar Header */}
            <div className="p-4 border-b border-black/10 flex flex-wrap items-center justify-between gap-3 bg-white/70 backdrop-blur-md">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  placeholder={language === 'mr' ? 'नोंदीचे शीर्षक द्या (Title)...' : 'Note Title...'}
                  className="text-lg font-black text-slate-900 bg-transparent border-none focus:outline-none w-full placeholder:text-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Category Dropdown */}
                <select
                  value={editingNote.category}
                  onChange={(e) => {
                    const updated = { ...editingNote, category: e.target.value as any };
                    setEditingNote(updated);
                    handleSaveNote(updated);
                  }}
                  className="text-xs font-black text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === 'mr' ? c.labelMr : c.labelEn}
                    </option>
                  ))}
                </select>

                {/* Color Palette */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => {
                        const updated = { ...editingNote, color: c.hex };
                        setEditingNote(updated);
                        handleSaveNote(updated);
                      }}
                      style={{ backgroundColor: c.hex }}
                      className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                        editingNote.color === c.hex ? 'border-slate-900 scale-110 shadow-xs' : 'border-slate-300'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Pin Button */}
                <button
                  onClick={(e) => togglePin(e, editingNote)}
                  className={`p-2 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                    editingNote.isPinned
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={editingNote.isPinned ? 'Pinned' : 'Pin note'}
                >
                  <Pin className={`w-4 h-4 ${editingNote.isPinned ? 'fill-amber-500 rotate-45' : ''}`} />
                </button>

                {/* Print Button */}
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Print Note"
                >
                  <Printer className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteNote(editingNote.id, e)}
                  className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Save Button */}
                <button
                  onClick={() => handleSaveNote()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {showSavedToast ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'mr' ? 'जतन झाले' : 'Saved'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{language === 'mr' ? 'सेव्ह करा' : 'Save'}</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    handleSaveNote();
                    setIsEditorOpen(false);
                  }}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Editor Body: Large Document View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              {/* Free-Text Description */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  📝 {language === 'mr' ? 'नोंद व माहिती (Description / Free Notes)' : 'Description & Notes'}
                </label>
                <textarea
                  value={editingNote.content || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  onBlur={() => handleSaveNote()}
                  rows={4}
                  placeholder={language === 'mr' ? 'येथे तपशीलवार माहिती लिहा...' : 'Type note details here...'}
                  className="w-full text-sm font-semibold text-slate-900 bg-white/80 border border-black/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Tool 1: Interactive Checklists */}
              <div className="bg-white/90 rounded-2xl border border-black/10 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'mr' ? 'टू-डू यादी व चेकलिस्ट (Checklists)' : 'Tasks & Checklists'}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {(editingNote.items || []).filter((i) => i.done).length} / {(editingNote.items || []).length} {language === 'mr' ? 'पूर्ण' : 'done'}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {(editingNote.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 group"
                    >
                      <button
                        onClick={() => toggleCheckItem(item.id)}
                        className="text-slate-400 hover:text-emerald-600 cursor-pointer"
                      >
                        {item.done ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <span
                        className={`text-xs font-bold flex-1 ${
                          item.done ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {item.text}
                      </span>
                      <button
                        onClick={() => removeCheckItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Check Item Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder={language === 'mr' ? '+ नवीन काम / चेकलिस्ट आयटम जोडा...' : '+ Add a task...'}
                    value={newCheckText}
                    onChange={(e) => setNewCheckText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCheckItem();
                    }}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={addCheckItem}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                  >
                    {language === 'mr' ? 'जोडा' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Tool 2: Bullet Points */}
              <div className="bg-white/90 rounded-2xl border border-black/10 p-5 space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <List className="w-4 h-4 text-blue-600" />
                  <span>{language === 'mr' ? 'महत्वाचे मुद्दे (Bullet Points)' : 'Bullet Points'}</span>
                </h3>

                <div className="space-y-2">
                  {(editingNote.bullets || []).map((bullet, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 flex-1">{bullet}</span>
                      <button
                        onClick={() => removeBullet(idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder={language === 'mr' ? '+ नवीन मुद्दा जोडा...' : '+ Add bullet point...'}
                    value={newBulletText}
                    onChange={(e) => setNewBulletText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addBullet();
                    }}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={addBullet}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                  >
                    {language === 'mr' ? 'जोडा' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Tool 3: Spreadsheet Calculation Table */}
              <div className="bg-white/90 rounded-2xl border border-black/10 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-purple-600" />
                    <span>{language === 'mr' ? 'हिशोब तक्ता (Interactive Spreadsheet Table)' : 'Spreadsheet Table'}</span>
                  </h3>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={addTableColumn}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black cursor-pointer"
                    >
                      + {language === 'mr' ? 'स्तंभ (Col)' : 'Column'}
                    </button>
                    <button
                      onClick={addTableRow}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                    >
                      + {language === 'mr' ? 'ओळ (Row)' : 'Row'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        {editingNote.tableData?.headers?.map((header, colIdx) => (
                          <th key={colIdx} className="p-2.5 border-r border-slate-200 last:border-r-0 font-black text-slate-800">
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => updateTableHeader(colIdx, e.target.value)}
                              onBlur={() => handleSaveNote()}
                              className="w-full bg-transparent font-black text-slate-900 focus:outline-none"
                            />
                          </th>
                        ))}
                        <th className="w-10 p-2.5 text-center text-slate-400 font-bold">#</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editingNote.tableData?.rows || []).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border-r border-slate-200 last:border-r-0">
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => updateTableCell(rIdx, cIdx, e.target.value)}
                                onBlur={() => handleSaveNote()}
                                placeholder="..."
                                className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                              />
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeTableRow(rIdx)}
                              className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
