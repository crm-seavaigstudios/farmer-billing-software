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
  X
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', labelEn: 'All Notes', labelMr: 'सर्व नोंदी' },
  { id: 'GENERAL', labelEn: 'General', labelMr: 'सामान्य' },
  { id: 'FARMER', labelEn: 'Farmer Follow-up', labelMr: 'शेतकरी फॉलोअप' },
  { id: 'LOGISTICS', labelEn: 'Logistics & Transport', labelMr: 'वाहतूक व गाड्या' },
  { id: 'ACCOUNTS', labelEn: 'Accounts & Payments', labelMr: 'हिशोब व पेमेंट' },
  { id: 'IMPORTANT', labelEn: 'Urgent & Important', labelMr: 'महत्वाचे' },
];

const COLORS = [
  { name: 'White', bg: 'bg-white', border: 'border-slate-200', hex: '#ffffff' },
  { name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-200', hex: '#fef3c7' },
  { name: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', hex: '#ecfdf5' },
  { name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-200', hex: '#eff6ff' },
  { name: 'Purple', bg: 'bg-purple-50', border: 'border-purple-200', hex: '#faf5ff' },
  { name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-200', hex: '#fff1f2' },
];

export default function NotesPage() {
  const { t, language } = useLanguage();
  const [notes, setNotes] = useState<AgencyNote[]>([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<AgencyNote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // New item inputs
  const [newCheckText, setNewCheckText] = useState('');
  const [newBulletText, setNewBulletText] = useState('');

  useEffect(() => {
    async function loadNotes() {
      const data = await apiGetNotes();
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
      }
    }
    loadNotes();
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesCat = activeCategory === 'ALL' || n.category === activeCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = n.title.toLowerCase().includes(q);
      const inContent = n.content?.toLowerCase().includes(q);
      const inItems = n.items?.some((it) => it.text.toLowerCase().includes(q));
      const inBullets = n.bullets?.some((b) => b.toLowerCase().includes(q));
      const inTable = n.tableData?.rows?.some((r) => r.some((c) => c.toLowerCase().includes(q)));

      return inTitle || inContent || inItems || inBullets || inTable;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [notes, activeCategory, searchQuery]);

  const handleCreateNewNote = async () => {
    const newNote: Partial<AgencyNote> = {
      title: language === 'mr' ? 'नवीन नोंद' : 'Untitled Note',
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
    };
    const saved = await apiSaveNote(newNote);
    setNotes([saved, ...notes]);
    setSelectedNote(saved);
  };

  const handleSaveCurrentNote = async (updatedNoteToSave?: AgencyNote) => {
    const noteToSave = updatedNoteToSave || selectedNote;
    if (!noteToSave) return;
    setIsSaving(true);
    try {
      const saved = await apiSaveNote(noteToSave);
      setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
      setSelectedNote(saved);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm(language === 'mr' ? 'ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this note?')) return;
    await apiDeleteNote(id);
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    if (selectedNote?.id === id) {
      setSelectedNote(updated.length > 0 ? updated[0] : null);
    }
  };

  const togglePin = async (e: React.MouseEvent, note: AgencyNote) => {
    e.stopPropagation();
    const updated = { ...note, isPinned: !note.isPinned };
    const saved = await apiSaveNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
    if (selectedNote?.id === note.id) setSelectedNote(saved);
  };

  // Checklist Actions
  const addCheckItem = () => {
    if (!newCheckText.trim() || !selectedNote) return;
    const newItem = { id: `item-${Date.now()}`, text: newCheckText.trim(), done: false };
    const updatedItems = [...(selectedNote.items || []), newItem];
    const updated = { ...selectedNote, items: updatedItems };
    setSelectedNote(updated);
    setNewCheckText('');
    handleSaveCurrentNote(updated);
  };

  const toggleCheckItem = (itemId: string) => {
    if (!selectedNote) return;
    const updatedItems = (selectedNote.items || []).map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it
    );
    const updated = { ...selectedNote, items: updatedItems };
    setSelectedNote(updated);
    handleSaveCurrentNote(updated);
  };

  const removeCheckItem = (itemId: string) => {
    if (!selectedNote) return;
    const updatedItems = (selectedNote.items || []).filter((it) => it.id !== itemId);
    const updated = { ...selectedNote, items: updatedItems };
    setSelectedNote(updated);
    handleSaveCurrentNote(updated);
  };

  // Bullet Actions
  const addBullet = () => {
    if (!newBulletText.trim() || !selectedNote) return;
    const updatedBullets = [...(selectedNote.bullets || []), newBulletText.trim()];
    const updated = { ...selectedNote, bullets: updatedBullets };
    setSelectedNote(updated);
    setNewBulletText('');
    handleSaveCurrentNote(updated);
  };

  const removeBullet = (index: number) => {
    if (!selectedNote) return;
    const updatedBullets = (selectedNote.bullets || []).filter((_, i) => i !== index);
    const updated = { ...selectedNote, bullets: updatedBullets };
    setSelectedNote(updated);
    handleSaveCurrentNote(updated);
  };

  // Table Actions
  const addTableRow = () => {
    if (!selectedNote) return;
    const numCols = selectedNote.tableData?.headers?.length || 4;
    const newRow = Array(numCols).fill('');
    const currentTable = selectedNote.tableData || { headers: ['Item', 'Qty', 'Rate', 'Total'], rows: [] };
    const updated = {
      ...selectedNote,
      tableData: {
        ...currentTable,
        rows: [...currentTable.rows, newRow]
      }
    };
    setSelectedNote(updated);
    handleSaveCurrentNote(updated);
  };

  const removeTableRow = (rowIndex: number) => {
    if (!selectedNote || !selectedNote.tableData) return;
    const updatedRows = selectedNote.tableData.rows.filter((_, idx) => idx !== rowIndex);
    const updated = {
      ...selectedNote,
      tableData: {
        ...selectedNote.tableData,
        rows: updatedRows
      }
    };
    setSelectedNote(updated);
    handleSaveCurrentNote(updated);
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!selectedNote || !selectedNote.tableData) return;
    const updatedRows = selectedNote.tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const newRow = [...row];
      newRow[colIndex] = value;
      return newRow;
    });
    const updated = {
      ...selectedNote,
      tableData: {
        ...selectedNote.tableData,
        rows: updatedRows
      }
    };
    setSelectedNote(updated);
  };

  const updateTableHeader = (colIndex: number, value: string) => {
    if (!selectedNote || !selectedNote.tableData) return;
    const updatedHeaders = [...selectedNote.tableData.headers];
    updatedHeaders[colIndex] = value;
    const updated = {
      ...selectedNote,
      tableData: {
        ...selectedNote.tableData,
        headers: updatedHeaders
      }
    };
    setSelectedNote(updated);
  };

  const addTableColumn = () => {
    if (!selectedNote) return;
    const currentTable = selectedNote.tableData || { headers: ['Item', 'Qty', 'Rate', 'Total'], rows: [] };
    const updated = {
      ...selectedNote,
      tableData: {
        headers: [...currentTable.headers, `स्तंभ ${currentTable.headers.length + 1}`],
        rows: currentTable.rows.map((row) => [...row, ''])
      }
    };
    setSelectedNote(updated);
    handleSaveCurrentNote(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  const completedChecksCount = selectedNote?.items?.filter((it) => it.done).length || 0;
  const totalChecksCount = selectedNote?.items?.length || 0;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-hidden p-3 md:p-6 flex flex-col gap-4">
          {/* Top Bar / Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <StickyNote className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {language === 'mr' ? 'एजन्सी नोंदी व डिजिटल डायरी' : 'Agency Notes & Digital Diary'}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {notes.length} {language === 'mr' ? 'नोंदी' : 'Notes'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'mr'
                    ? 'दैनंदिन कामांच्या चेकलिस्ट, शेतकऱ्यांच्या महत्वाच्या नोंदी आणि हिशोबांचे तक्ते जतन करा.'
                    : 'Interactive checklists, bullet points, farmer reminders and calculation tables.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNewNote}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'mr' ? 'नवीन नोंद बनवा' : 'Create New Note'}</span>
              </button>
            </div>
          </div>

          {/* Main Layout: Split Note List (Left) & Note Editor (Right) */}
          <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
            {/* Left Column: Note List & Filters */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Search & Category Tabs */}
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={language === 'mr' ? 'नोंदींमध्ये शोधा...' : 'Search notes...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {CATEGORIES.map((cat) => {
                    const active = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {language === 'mr' ? cat.labelMr : cat.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Scrollable List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <StickyNote className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {language === 'mr' ? 'कोणत्याही नोंदी आढळल्या नाहीत' : 'No notes found'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === 'mr' ? 'नवीन नोंद बनवण्यासाठी वरील बटण दाबा.' : 'Click "Create New Note" to start.'}
                    </p>
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const isSelected = selectedNote?.id === note.id;
                    const checkItemsCount = note.items?.length || 0;
                    const bulletsCount = note.bullets?.length || 0;
                    const tableRowsCount = note.tableData?.rows?.length || 0;

                    return (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        style={{ backgroundColor: note.color || '#ffffff' }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-1 flex items-center gap-1.5">
                            {note.title || (language === 'mr' ? 'नवीन नोंद' : 'Untitled Note')}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => togglePin(e, note)}
                              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                                note.isPinned ? 'text-amber-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                              }`}
                              title={note.isPinned ? 'Unpin' : 'Pin to top'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500 rotate-45' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {note.content && (
                          <p className="text-[11px] text-slate-600 font-medium line-clamp-2 mt-1">
                            {note.content}
                          </p>
                        )}

                        {/* Badges for Checklists/Bullets/Tables */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-black/5 text-[10px] text-slate-500 font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-black/5 text-slate-700">
                            {CATEGORIES.find((c) => c.id === note.category)?.[language === 'mr' ? 'labelMr' : 'labelEn'] || note.category}
                          </span>
                          {checkItemsCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              <CheckSquare className="w-3 h-3" />
                              {note.items?.filter((i) => i.done).length}/{checkItemsCount}
                            </span>
                          )}
                          {bulletsCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              <List className="w-3 h-3" />
                              {bulletsCount}
                            </span>
                          )}
                          {tableRowsCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                              <TableIcon className="w-3 h-3" />
                              {tableRowsCount}
                            </span>
                          )}
                          <span className="ml-auto text-[9px] text-slate-400 font-medium">
                            {new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Note Editor & Tools */}
            {selectedNote ? (
              <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Editor Header */}
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) => {
                        const updated = { ...selectedNote, title: e.target.value };
                        setSelectedNote(updated);
                      }}
                      onBlur={() => handleSaveCurrentNote()}
                      placeholder={language === 'mr' ? 'नोंदीचे शीर्षक द्या...' : 'Note title...'}
                      className="text-base font-black text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Category Selector */}
                    <select
                      value={selectedNote.category}
                      onChange={(e) => {
                        const updated = { ...selectedNote, category: e.target.value as any };
                        setSelectedNote(updated);
                        handleSaveCurrentNote(updated);
                      }}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                        <option key={c.id} value={c.id}>
                          {language === 'mr' ? c.labelMr : c.labelEn}
                        </option>
                      ))}
                    </select>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                      {COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => {
                            const updated = { ...selectedNote, color: c.hex };
                            setSelectedNote(updated);
                            handleSaveCurrentNote(updated);
                          }}
                          style={{ backgroundColor: c.hex }}
                          className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                            selectedNote.color === c.hex
                              ? 'border-slate-800 scale-110 shadow-xs'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>

                    {/* Pin Toggle */}
                    <button
                      onClick={(e) => togglePin(e, selectedNote)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        selectedNote.isPinned
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title={selectedNote.isPinned ? 'Pinned' : 'Pin Note'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${selectedNote.isPinned ? 'fill-amber-500 rotate-45' : ''}`} />
                    </button>

                    {/* Print Button */}
                    <button
                      onClick={handlePrint}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                      title="Print Note"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Note */}
                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveCurrentNote()}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {showSavedToast ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'mr' ? 'जतन झाले' : 'Saved'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>{language === 'mr' ? 'सेव्ह करा' : 'Save'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  {/* General Free Text Content */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      {language === 'mr' ? 'नोंद तपशील (General Description / Notes)' : 'General Description / Notes'}
                    </label>
                    <textarea
                      value={selectedNote.content || ''}
                      onChange={(e) => {
                        const updated = { ...selectedNote, content: e.target.value };
                        setSelectedNote(updated);
                      }}
                      onBlur={() => handleSaveCurrentNote()}
                      rows={3}
                      placeholder={language === 'mr' ? 'येथे तपशीलवार माहिती लिहा...' : 'Write note description here...'}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Section 1: Checklists (To-Do Items) */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {language === 'mr' ? 'चेकलिस्ट / टू-डू यादी (Checklist)' : 'Checklist / Tasks'}
                        </h3>
                      </div>
                      {totalChecksCount > 0 && (
                        <span className="text-[11px] font-bold text-slate-500">
                          {completedChecksCount} / {totalChecksCount} {language === 'mr' ? 'पूर्ण' : 'done'}
                        </span>
                      )}
                    </div>

                    {/* Check Items List */}
                    <div className="space-y-2 mb-3">
                      {(selectedNote.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/70 group"
                        >
                          <button
                            onClick={() => toggleCheckItem(item.id)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          >
                            {item.done ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <span
                            className={`text-xs font-medium flex-1 ${
                              item.done ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {item.text}
                          </span>
                          <button
                            onClick={() => removeCheckItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-600 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Check Item Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={language === 'mr' ? 'नवीन काम / चेकलिस्ट आयटम जोडा...' : 'Add a checklist task...'}
                        value={newCheckText}
                        onChange={(e) => setNewCheckText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addCheckItem();
                        }}
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                      <button
                        onClick={addCheckItem}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'mr' ? 'जोडा' : 'Add'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Bullet Points */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <List className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {language === 'mr' ? 'महत्वाचे मुद्दे (Bullet Points)' : 'Bullet Points'}
                      </h3>
                    </div>

                    {/* Bullet List */}
                    <div className="space-y-1.5 mb-3">
                      {(selectedNote.bullets || []).map((bullet, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/70 group"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span className="text-xs font-medium text-slate-800 flex-1">{bullet}</span>
                          <button
                            onClick={() => removeBullet(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-600 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Bullet Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={language === 'mr' ? 'नवीन मुद्दा जोडा (उदा. सायंकाळी हिशोब करणे)...' : 'Add bullet point...'}
                        value={newBulletText}
                        onChange={(e) => setNewBulletText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addBullet();
                        }}
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                      <button
                        onClick={addBullet}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'mr' ? 'जोडा' : 'Add'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 3: Interactive Table (तक्ता) */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-purple-600" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {language === 'mr' ? 'हिशोब तक्ता (Interactive Spreadsheet Table)' : 'Spreadsheet Table'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={addTableColumn}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-purple-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{language === 'mr' ? '+ स्तंभ (Col)' : '+ Column'}</span>
                        </button>
                        <button
                          onClick={addTableRow}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{language === 'mr' ? '+ ओळ (Row)' : '+ Row'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Editable Table Container */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200">
                            {selectedNote.tableData?.headers?.map((header, colIdx) => (
                              <th key={colIdx} className="p-2 border-r border-slate-200 last:border-r-0 font-bold text-slate-700">
                                <input
                                  type="text"
                                  value={header}
                                  onChange={(e) => updateTableHeader(colIdx, e.target.value)}
                                  onBlur={() => handleSaveCurrentNote()}
                                  className="w-full bg-transparent font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 rounded px-1"
                                />
                              </th>
                            ))}
                            <th className="w-10 p-2 text-center text-slate-400 font-semibold">#</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedNote.tableData?.rows || []).map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1.5 border-r border-slate-200 last:border-r-0">
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => updateTableCell(rIdx, cIdx, e.target.value)}
                                    onBlur={() => handleSaveCurrentNote()}
                                    placeholder="..."
                                    className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none focus:bg-purple-50/50 rounded px-1.5 py-1"
                                  />
                                </td>
                              ))}
                              <td className="p-1.5 text-center">
                                <button
                                  onClick={() => removeTableRow(rIdx)}
                                  className="p-1 text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                  <StickyNote className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-800 mb-1">
                  {language === 'mr' ? 'कोणतीही नोंद निवडलेली नाही' : 'No Note Selected'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6 font-medium">
                  {language === 'mr'
                    ? 'डाव्या बाजूच्या यादीतून नोंद निवडा किंवा नवीन नोंद तयार करण्यासाठी खालील बटण दाबा.'
                    : 'Select a note from the left sidebar or create a new note to start writing.'}
                </p>
                <button
                  onClick={handleCreateNewNote}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'mr' ? 'नवीन नोंद बनवा' : 'Create New Note'}</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
