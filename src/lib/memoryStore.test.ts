import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAlarmItem,
  addNoteItem,
  addTaskItem,
  clearCompletedTaskItems,
  dismissAlarmItem,
  formatCountdown,
  toggleTaskItem,
} from './memoryStore';
import { extractCoachingTip } from './jarvisPrompts';

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
    'Splendid effort, Sir Epalse. Tell me more about your project.\n[COACH_TIP]{"correction":"I have been working","naturalPhrase":"I have been focusing on","tip":"Use present perfect continuous for ongoing work."}[/COACH_TIP]';
  const result = extractCoachingTip(raw);
  assert.equal(result.cleanText, 'Splendid effort, Sir Epalse. Tell me more about your project.');
  assert.equal(result.coachingTip?.naturalPhrase, 'I have been focusing on');
});
