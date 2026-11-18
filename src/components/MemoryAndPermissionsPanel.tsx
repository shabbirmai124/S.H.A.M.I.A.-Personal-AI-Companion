import { useState, type FormEvent } from 'react';
import { Bell, BookOpen, CalendarClock, CheckSquare, Plus, Sparkles, Square, Trash2 } from 'lucide-react';
import { formatCountdown } from '../lib/memoryStore';
import type {
  AlarmItem,
  DeviceControlState,
  NoteItem,
  OpenSourceModelSpec,
  PermissionCapability,
  PermissionPolicy,
  PermissionRule,
  RoutineItem,
  SyllabusItem,
  TaskItem,
} from '../types/shamia';
import { DeviceControlDeck } from './DeviceControlDeck';
import { OpenSourceModelHub } from './OpenSourceModelHub';

interface MemoryAndPermissionsPanelProps {
  tasks: TaskItem[];
  notes: NoteItem[];
  alarms: AlarmItem[];
  routine: RoutineItem[];
  syllabus: SyllabusItem[];
  nowMs: number;
  permissions: PermissionRule[];
  deviceControls: DeviceControlState;
  selectedModelId: string;
  ollamaUrl: string;
  webSearchEnabled: boolean;
  ensembleEnabled: boolean;
  ensembleModelIds: string[];
  onAddTask: (title: string, priority: 'high' | 'normal') => void;
  onToggleTask: (id: string) => void;
  onClearCompleted: () => void;
  onAddNote: (content: string) => void;
  onDeleteNote: (id: string) => void;
  onDismissAlarm: (id: string) => void;
  onAddRoutine: (timeLabel: string, title: string, category: RoutineItem['category']) => void;
  onToggleRoutine: (id: string) => void;
  onDeleteRoutine: (id: string) => void;
  onAddSyllabus: (courseCode: string, courseTitle: string, topic: string, examNote?: string) => void;
  onToggleSyllabus: (id: string) => void;
  onDeleteSyllabus: (id: string) => void;
  onBuildRoutineStudyPlan: () => void;
  onUpdatePermission: (capability: PermissionCapability, policy: PermissionPolicy) => void;
  onRequestToggleControl: (
    setting: 'wifi' | 'bluetooth' | 'dnd' | 'flashlight',
    nextVal: boolean
  ) => void;
  onRequestBrightness: (level: number) => void;
  onRequestDial: (target: string) => void;
  onRequestOpenApp: (appName: string) => void;
  onSelectModel: (spec: OpenSourceModelSpec) => void;
  onChangeOllamaUrl: (url: string) => void;
  onToggleWebSearch: (enabled: boolean) => void;
  onToggleEnsemble: (enabled: boolean) => void;
  onToggleEnsembleModel: (modelId: string) => void;
  activeTab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
}

export type PanelTab = 'memory' | 'device' | 'models' | 'vault';

export function MemoryAndPermissionsPanel({
  tasks,
  notes,
  alarms,
  routine,
  syllabus,
  nowMs,
  permissions,
  deviceControls,
  selectedModelId,
  ollamaUrl,
  webSearchEnabled,
  ensembleEnabled,
  ensembleModelIds,
  onAddTask,
  onToggleTask,
  onClearCompleted,
  onAddNote,
  onDeleteNote,
  onDismissAlarm,
  onAddRoutine,
  onToggleRoutine,
  onDeleteRoutine,
  onAddSyllabus,
  onToggleSyllabus,
  onDeleteSyllabus,
  onBuildRoutineStudyPlan,
  onUpdatePermission,
  onRequestToggleControl,
  onRequestBrightness,
  onRequestDial,
  onRequestOpenApp,
  onSelectModel,
  onChangeOllamaUrl,
  onToggleWebSearch,
  onToggleEnsemble,
  onToggleEnsembleModel,
  activeTab: controlledTab,
  onTabChange,
}: MemoryAndPermissionsPanelProps) {
  const [internalTab, setInternalTab] = useState<PanelTab>('memory');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: PanelTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [memorySection, setMemorySection] = useState<'tasks' | 'study'>('tasks');
  const [taskInput, setTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<'normal' | 'high'>('normal');
  const [noteInput, setNoteInput] = useState('');
  const [routineTime, setRoutineTime] = useState('08:30 AM');
  const [routineTitle, setRoutineTitle] = useState('');
  const [syllabusCode, setSyllabusCode] = useState('');
  const [syllabusCourse, setSyllabusCourse] = useState('');
  const [syllabusTopic, setSyllabusTopic] = useState('');

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.length - pendingCount;

  const handleTaskSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    onAddTask(taskInput.trim(), taskPriority);
    setTaskInput('');
  };

  const handleNoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    onAddNote(noteInput.trim());
    setNoteInput('');
  };

  const handleRoutineSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;
    onAddRoutine(routineTime, routineTitle.trim(), 'study');
    setRoutineTitle('');
  };

  const handleSyllabusSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!syllabusCourse.trim() && !syllabusTopic.trim()) return;
    onAddSyllabus(syllabusCode, syllabusCourse, syllabusTopic);
    setSyllabusCode('');
    setSyllabusCourse('');
    setSyllabusTopic('');
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Clean non-overlapping 4-tab switcher */}
      <div
        role="tablist"
        aria-label="Workspace panels"
        className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#06080C] border border-white/[0.08] shrink-0"
      >
        {(
          [
            { id: 'memory', label: `Tasks (${pendingCount})` },
            { id: 'device', label: 'Phone' },
            { id: 'models', label: 'Models' },
            { id: 'vault', label: 'Vault' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[36px] px-1.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap truncate ${
                active
                  ? 'bg-[#121923] text-[#38BDF8] border border-[#38BDF8]/30'
                  : 'text-[#94A3B8] hover:text-[#E8EEF3]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dedicated Scroll Area — strictly isolated below tab bar so inputs never overlap */}
      <div className="flex-1 min-h-0 overflow-y-auto hud-scroll pr-1 pt-0.5">
        {activeTab === 'memory' && (
          <div className="flex flex-col gap-5">
            {/* Compact Sub-View Toggle: Tasks & Notes vs Routine & University Syllabus */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#06080C] border border-white/[0.07]">
              <button
                type="button"
                onClick={() => setMemorySection('tasks')}
                className={`min-h-[32px] px-2 rounded-lg text-[11px] font-medium transition-colors ${
                  memorySection === 'tasks'
                    ? 'bg-[#121923] text-[#E8EEF3] border border-white/10'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Tasks &amp; Notes
              </button>
              <button
                type="button"
                onClick={() => setMemorySection('study')}
                className={`min-h-[32px] px-2 rounded-lg text-[11px] font-medium transition-colors ${
                  memorySection === 'study'
                    ? 'bg-[#121923] text-[#38BDF8] border border-[#38BDF8]/30'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Routine &amp; Syllabus
              </button>
            </div>

            {memorySection === 'study' ? (
              <div className="flex flex-col gap-5">
                <button
                  type="button"
                  onClick={onBuildRoutineStudyPlan}
                  className="min-h-[38px] px-3 py-2 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/35 text-xs font-semibold text-[#7DD3FC] hover:bg-[#38BDF8]/25 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Build Study Plan from Routine &amp; Syllabus</span>
                </button>

                {/* Daily Routine Section */}
                <section aria-label="Daily Routine" className="flex flex-col gap-2.5">
                  <h2 className="text-xs font-semibold tracking-wide text-[#94A3B8] flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
                    <span>Daily Routine</span>
                  </h2>
                  <form onSubmit={handleRoutineSubmit} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={routineTime}
                        onChange={(e) => setRoutineTime(e.target.value)}
                        aria-label="Routine time"
                        placeholder="08:00 AM"
                        className="w-24 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#090D12] border border-white/10 text-xs text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
                      />
                      <input
                        type="text"
                        value={routineTitle}
                        onChange={(e) => setRoutineTitle(e.target.value)}
                        aria-label="Routine activity"
                        placeholder="Add routine block..."
                        className="flex-1 min-w-0 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#090D12] border border-white/10 text-xs text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                      />
                      <button
                        type="submit"
                        aria-label="Add routine item"
                        className="min-h-[38px] min-w-[38px] rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/25 flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  <ul className="flex flex-col divide-y divide-white/[0.06]">
                    {routine.map((item) => (
                      <li key={item.id} className="py-2 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleRoutine(item.id)}
                            aria-label={`Toggle "${item.title}"`}
                            className="mt-0.5 text-[#38BDF8] shrink-0"
                          >
                            {item.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-[#64748B]" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-[11px] font-mono-tabular text-[#38BDF8]">
                              {item.timeLabel}
                            </p>
                            <p
                              className={`text-xs leading-snug ${
                                item.completed ? 'line-through text-[#64748B]' : 'text-[#E8EEF3]'
                              }`}
                            >
                              {item.title}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteRoutine(item.id)}
                          aria-label={`Delete routine "${item.title}"`}
                          className="text-[#64748B] hover:text-rose-300 shrink-0 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* University Syllabus Section */}
                <section
                  aria-label="University Syllabus"
                  className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.08]"
                >
                  <h2 className="text-xs font-semibold tracking-wide text-[#94A3B8] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
                    <span>University Syllabus</span>
                  </h2>
                  <form onSubmit={handleSyllabusSubmit} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={syllabusCode}
                        onChange={(e) => setSyllabusCode(e.target.value)}
                        aria-label="Course code"
                        placeholder="CS-301"
                        className="w-20 min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#090D12] border border-white/10 text-xs text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
                      />
                      <input
                        type="text"
                        value={syllabusCourse}
                        onChange={(e) => setSyllabusCourse(e.target.value)}
                        aria-label="Course name"
                        placeholder="Course name..."
                        className="flex-1 min-w-0 min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#090D12] border border-white/10 text-xs text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={syllabusTopic}
                        onChange={(e) => setSyllabusTopic(e.target.value)}
                        aria-label="Syllabus units or topic"
                        placeholder="Units / Chapters to cover..."
                        className="flex-1 min-w-0 min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#090D12] border border-white/10 text-xs text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                      />
                      <button
                        type="submit"
                        aria-label="Add syllabus item"
                        className="min-h-[36px] min-w-[36px] rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/25 flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  <ul className="flex flex-col gap-2">
                    {syllabus.map((syl) => (
                      <li
                        key={syl.id}
                        className="rounded-xl bg-[#090D12] border border-white/[0.07] p-2.5 flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleSyllabus(syl.id)}
                            aria-label={`Toggle "${syl.courseTitle}"`}
                            className="mt-0.5 text-[#38BDF8] shrink-0"
                          >
                            {syl.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-[#64748B]" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#38BDF8]">
                              {syl.courseCode} · {syl.courseTitle}
                            </p>
                            <p
                              className={`text-xs mt-0.5 leading-snug ${
                                syl.completed ? 'line-through text-[#64748B]' : 'text-[#CBD5E1]'
                              }`}
                            >
                              {syl.topic}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteSyllabus(syl.id)}
                          aria-label={`Delete "${syl.courseTitle}"`}
                          className="text-[#64748B] hover:text-rose-300 shrink-0 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <>
            {alarms.length > 0 && (
              <section aria-label="Active alarms" className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
                    Active Alarms
                  </h2>
                  <span className="font-mono-tabular text-xs text-[#38BDF8]">
                    {alarms.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {alarms.map((alarm) => (
                    <li
                      key={alarm.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#090D12] border border-[#38BDF8]/25 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bell className="w-4 h-4 text-[#38BDF8] shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#E8EEF3] truncate">
                            {alarm.label}
                          </p>
                          <p className="font-mono-tabular text-xs text-[#38BDF8]">
                            {alarm.triggered
                              ? 'Ring active'
                              : formatCountdown(alarm.triggerAt, nowMs)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDismissAlarm(alarm.id)}
                        aria-label={`Dismiss ${alarm.label}`}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs text-[#94A3B8] hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      >
                        Dismiss
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-label="Priorities ledger" className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
                  Priorities
                </h2>
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearCompleted}
                    className="text-xs text-[#38BDF8] hover:underline whitespace-nowrap"
                  >
                    Clear Completed
                  </button>
                )}
              </div>

              <form onSubmit={handleTaskSubmit} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="sr-only" htmlFor="new-task-input">
                    Add a priority task
                  </label>
                  <input
                    id="new-task-input"
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Remember a priority..."
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-[#090D12] border border-white/10 text-sm text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                  />
                  <button
                    type="submit"
                    aria-label="Add task"
                    className="min-h-[42px] min-w-[42px] rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/25 transition-colors flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <span>Priority:</span>
                  <button
                    type="button"
                    onClick={() => setTaskPriority('normal')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      taskPriority === 'normal'
                        ? 'bg-[#121923] text-[#E8EEF3] border border-white/15'
                        : 'hover:text-[#E8EEF3]'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskPriority('high')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      taskPriority === 'high'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                        : 'hover:text-[#E8EEF3]'
                    }`}
                  >
                    High
                  </button>
                </div>
              </form>

              {tasks.length === 0 ? (
                <p className="text-xs text-[#64748B] py-3">
                  No priorities recorded yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-white/[0.06]">
                  {tasks.map((task) => (
                    <li key={task.id} className="py-2.5 flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        aria-label={
                          task.completed
                            ? `Mark "${task.title}" incomplete`
                            : `Mark "${task.title}" complete`
                        }
                        className="min-h-[36px] min-w-[36px] -ml-1.5 flex items-center justify-center text-[#38BDF8] hover:opacity-80 shrink-0"
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-[#64748B]" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 pt-1.5">
                        <p
                          className={`text-sm leading-snug ${
                            task.completed
                              ? 'line-through text-[#64748B]'
                              : 'text-[#E8EEF3]'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.priority === 'high' && !task.completed && (
                          <span className="text-[11px] text-amber-300">High priority</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-label="Quick notes"
              className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.08]"
            >
              <h2 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
                Local Notes
              </h2>
              <form onSubmit={handleNoteSubmit} className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor="new-note-input">
                  Add a quick note
                </label>
                <input
                  id="new-note-input"
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Save a quick note..."
                  className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-[#090D12] border border-white/10 text-sm text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                />
                <button
                  type="submit"
                  aria-label="Save note"
                  className="min-h-[42px] min-w-[42px] rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/25 transition-colors flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {notes.length === 0 ? (
                <p className="text-xs text-[#64748B] py-2">No archived notes.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-xl bg-[#090D12] border border-white/[0.08] px-3 py-2.5 flex items-start justify-between gap-2"
                    >
                      <p className="text-xs text-[#CBD5E1] leading-relaxed">{note.content}</p>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label={`Delete note "${note.content.slice(0, 24)}"`}
                        className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#64748B] hover:text-rose-300 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'device' && (
          <DeviceControlDeck
            controls={deviceControls}
            onRequestToggle={onRequestToggleControl}
            onRequestBrightness={onRequestBrightness}
            onRequestDial={onRequestDial}
            onRequestOpenApp={onRequestOpenApp}
          />
        )}

        {activeTab === 'models' && (
          <OpenSourceModelHub
            selectedModelId={selectedModelId}
            ollamaUrl={ollamaUrl}
            webSearchEnabled={webSearchEnabled}
            ensembleEnabled={ensembleEnabled}
            ensembleModelIds={ensembleModelIds}
            onSelectModel={onSelectModel}
            onChangeOllamaUrl={onChangeOllamaUrl}
            onToggleWebSearch={onToggleWebSearch}
            onToggleEnsemble={onToggleEnsemble}
            onToggleEnsembleModel={onToggleEnsembleModel}
          />
        )}

        {activeTab === 'vault' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Every sensitive phone capability honors your boundary below and never executes
              without your consent.
            </p>

            <ul className="flex flex-col gap-3">
              {permissions.map((rule) => (
                <li
                  key={rule.capability}
                  data-testid={`permission-rule-${rule.capability}`}
                  className="rounded-xl bg-[#090D12] border border-white/[0.08] p-3 flex flex-col gap-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[#E8EEF3]">{rule.label}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label={`${rule.label} permission policy`}
                    className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#06080C] border border-white/[0.06]"
                  >
                    {(
                      [
                        { value: 'ask', label: 'Ask' },
                        { value: 'always', label: 'Allow' },
                        { value: 'deny', label: 'Deny' },
                      ] as const
                    ).map((opt) => {
                      const active = rule.policy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onUpdatePermission(rule.capability, opt.value)}
                          className={`min-h-[34px] rounded-md text-xs font-medium transition-colors ${
                            active
                              ? opt.value === 'deny'
                                ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                                : opt.value === 'always'
                                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                                  : 'bg-[#38BDF8]/18 text-[#38BDF8] border border-[#38BDF8]/35'
                              : 'text-[#94A3B8] hover:text-[#E8EEF3]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
