import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAlarmItem,
  addNoteItem,
  addRoutineItem,
  addSyllabusItem,
  addTaskItem,
  clearCompletedTaskItems,
  deleteRoutineItem,
  deleteSyllabusItem,
  dismissAlarmItem,
  formatCountdown,
  OPEN_SOURCE_MODEL_CATALOG,
  OPEN_SOURCE_VOICE_MODELS,
  toggleRoutineItem,
  toggleSyllabusItem,
  toggleTaskItem,
} from './memoryStore';
import { extractCoachingTip } from './shamiaPrompts';

test('task reducers add, toggle, and clear completed items properly', () => {
  let tasks = addTaskItem([], 'Inspect Mark VII thrusters', 'high', 't1', '2026-11-17T09:00:00Z');
  tasks = addTaskItem(tasks, 'Call Pepper', 'normal', 't2', '2026-11-17T09:01:00Z');
  assert.equal(tasks.length, 2);

  tasks = toggleTaskItem(tasks, 't1');
  assert.equal(tasks.find((t) => t.id === 't1')?.completed, true);

  tasks = clearCompletedTaskItems(tasks);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 't2');
});

test('note and alarm reducers plus countdown formatting work accurately', () => {
  const notes = addNoteItem([], 'Backup arc capacitor', 'n1', '2026-11-17T09:00:00Z');
  assert.equal(notes.length, 1);

  const now = 1_700_000_000_000;
  let alarms = addAlarmItem([], 'Standup', now + 125_000, 'a1');
  assert.equal(formatCountdown(alarms[0].triggerAt, now), '02:05');

  alarms = dismissAlarmItem(alarms, 'a1');
  assert.equal(alarms.length, 0);
});

test('extractCoachingTip strips structured tag and parses tip cleanly', () => {
  const raw =
    'Splendid effort, Sir. Tell me more about your project.\n[COACH_TIP]{"correction":"I have been working","naturalPhrase":"I have been focusing on","tip":"Use present perfect continuous for ongoing work."}[/COACH_TIP]';
  const result = extractCoachingTip(raw);
  assert.equal(result.cleanText, 'Splendid effort, Sir. Tell me more about your project.');
  assert.equal(result.coachingTip?.naturalPhrase, 'I have been focusing on');
});

test('model catalog includes Gemma 4, NVIDIA Nemotron, 20B, Chinese under-10B flagships, DeepSeek 2B Offline Core, and offline voice models', () => {
  assert.ok(OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'gemma-4-free'));
  assert.ok(OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'qwen3-8b-chinese'));
  assert.ok(OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'minicpm-o-26'));
  assert.ok(OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'glm-4-9b'));
  assert.ok(OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'nemotron-nano-8b'));
  assert.ok(OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'nemotron-mini-4b'));
  assert.ok(
    OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'gpt-oss-20b-free' && m.params.includes('20B'))
  );
  assert.ok(
    OPEN_SOURCE_MODEL_CATALOG.some((m) => m.id === 'offline-core' && m.params.includes('2B'))
  );
  assert.ok(OPEN_SOURCE_VOICE_MODELS.some((v) => v.id === 'whisper-tiny-en' && v.kind === 'stt'));
  assert.ok(OPEN_SOURCE_VOICE_MODELS.some((v) => v.id === 'whisper-small-en' && v.kind === 'stt'));
  assert.ok(OPEN_SOURCE_VOICE_MODELS.some((v) => v.id === 'kokoro-82m-tts' && v.kind === 'tts'));
});

test('routine and university syllabus reducers add, toggle, and delete items cleanly', () => {
  let routine = addRoutineItem([], '08:00 AM', 'Algorithms Lecture', 'class', 'r1');
  assert.equal(routine.length, 1);
  routine = toggleRoutineItem(routine, 'r1');
  assert.equal(routine[0].completed, true);
  routine = deleteRoutineItem(routine, 'r1');
  assert.equal(routine.length, 0);

  let syllabus = addSyllabusItem([], 'PHY-202', 'Modern Physics', 'Quantum Mechanics Unit 1', undefined, 's1');
  assert.equal(syllabus.length, 1);
  assert.equal(syllabus[0].courseCode, 'PHY-202');
  syllabus = toggleSyllabusItem(syllabus, 's1');
  assert.equal(syllabus[0].completed, true);
  syllabus = deleteSyllabusItem(syllabus, 's1');
  assert.equal(syllabus.length, 0);
});
