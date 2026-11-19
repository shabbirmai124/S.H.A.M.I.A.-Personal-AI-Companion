import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationalIntent,
  evaluatePermission,
  matchLocalIntent,
  parseAlarmRequest,
  resolveSupportedApp,
  shouldTriggerLiveSearch,
  validatePhoneNumber,
} from './intentEngine';
import { DEFAULT_DEVICE_CONTROLS } from './memoryStore';
import { cleanHtmlArtifacts, generateOfflineCompanionReply } from './offlineCompanion';
import type { PermissionCapability, PermissionPolicy } from '../types/shamia';

const basePolicies: Record<PermissionCapability, PermissionPolicy> = {
  dial_contact: 'ask',
  open_app: 'ask',
  play_music: 'ask',
  set_alarm: 'ask',
  device_control: 'ask',
  manage_memory: 'always',
  microphone: 'ask',
};

test('permission evaluator enforces ask, always, and deny strictly', () => {
  assert.equal(evaluatePermission(basePolicies, 'dial_contact'), 'ask');
  assert.equal(evaluatePermission(basePolicies, 'device_control'), 'ask');
  assert.equal(evaluatePermission(basePolicies, 'manage_memory'), 'allow');
  assert.equal(
    evaluatePermission({ ...basePolicies, dial_contact: 'deny' }, 'dial_contact'),
    'deny'
  );
});

test('validatePhoneNumber accepts valid numbers and rejects invalid strings', () => {
  assert.equal(validatePhoneNumber('+1 (555) 234-5678'), '+15552345678');
  assert.equal(validatePhoneNumber('911'), '911');
  assert.equal(validatePhoneNumber('ab'), null);
});

test('resolveSupportedApp maps known apps safely and returns null for unknown', () => {
  const spotify = resolveSupportedApp('Spotify');
  assert.equal(spotify?.name, 'Spotify');
  assert.equal(spotify?.url, 'https://open.spotify.com');
  assert.equal(resolveSupportedApp('unknown-malware-bin'), null);
});

test('matchLocalIntent addresses user by custom addressAs (Sir) and handles hardware controls', () => {
  const ctx = {
    now: new Date('2026-11-17T09:00:00'),
    addressAs: 'Sir',
    batteryLevel: 88,
    batteryCharging: true,
    tasks: [],
    alarms: [],
    deviceControls: DEFAULT_DEVICE_CONTROLS,
  };

  const statusRes = matchLocalIntent('Status Report', ctx);
  assert.equal(statusRes.handled, true);
  assert.ok(statusRes.replyText?.includes('Sir'));
  assert.ok(!statusRes.replyText?.includes('Epalse'));

  const dndRes = matchLocalIntent('Turn on Do Not Disturb', ctx);
  assert.equal(dndRes.handled, true);
  assert.equal(dndRes.proposedAction?.type, 'toggle_dnd');
  assert.equal(dndRes.proposedAction?.capability, 'device_control');
  assert.equal(dndRes.proposedAction?.payload.enabled, true);

  const brightRes = matchLocalIntent('Set brightness to 60%', ctx);
  assert.equal(brightRes.handled, true);
  assert.equal(brightRes.proposedAction?.type, 'set_brightness');
  assert.equal(brightRes.proposedAction?.payload.level, 60);
});

test('detectConversationalIntent routes English tutor and mental support seamlessly without tabs', () => {
  assert.equal(
    detectConversationalIntent('I want to practice English speaking with you'),
    'english-tutor'
  );
  assert.equal(
    detectConversationalIntent('I am feeling overwhelmed and stressed today'),
    'mental-support'
  );
});

test('offlineCompanion provides real-time English grammar tips and breathing support offline', () => {
  const eng = generateOfflineCompanionReply(
    'Yesterday I am going to office and discuss about plan',
    'Sir',
    'Md Shabbir Mia',
    'gemma-4-free',
    'Gemma 4 · Real-Time Search'
  );
  assert.equal(eng.intent, 'english-tutor');
  assert.ok(eng.text.includes('Sir'));
  assert.ok(eng.text.includes('Gemma 4 · Real-Time Search'));
  assert.ok(!eng.text.includes('DeepSeek'));
  assert.ok(eng.coachingTip?.naturalPhrase);

  const mental = generateOfflineCompanionReply(
    'I feel really anxious and overwhelmed right now',
    'Sir',
    'Md Shabbir Mia',
    'gpt-oss-20b-free',
    'GPT-OSS 20B (Open Weights)'
  );
  assert.equal(mental.intent, 'mental-support');
  assert.equal(mental.showBreathingTool, true);
  assert.ok(mental.text.includes('GPT-OSS 20B (Open Weights)'));
  assert.ok(!mental.text.includes('DeepSeek'));
});

test('active model identity check reports exact selected model and never defaults to DeepSeek', () => {
  const gemmaCheck = generateOfflineCompanionReply(
    'which ai model am i using ?',
    'mam',
    'Kajol',
    'gemma-4-free',
    'Gemma 4 · Real-Time Search'
  );
  assert.ok(gemmaCheck.text.includes('[Gemma 4 · Real-Time Search · ID: gemma-4-free]'));
  assert.ok(!gemmaCheck.text.includes('DeepSeek'));

  const gptCheck = generateOfflineCompanionReply(
    'which ai model am i using ?',
    'mam',
    'Kajol',
    'gpt-oss-20b-free',
    'GPT-OSS 20B (Open Weights)'
  );
  assert.ok(gptCheck.text.includes('[GPT-OSS 20B (Open Weights) · ID: gpt-oss-20b-free]'));
  assert.ok(!gptCheck.text.includes('DeepSeek'));
});

test('cleanHtmlArtifacts decodes HTML entities and strips broken tags from search snippets', () => {
  const dirty =
    'Francis Scott Key&#039;s &quot;The Star-Spangled Banner&quot; &amp; <b>4nm</b> chips';
  const cleaned = cleanHtmlArtifacts(dirty);
  assert.equal(cleaned, 'Francis Scott Key\'s "The Star-Spangled Banner" & 4nm chips');
});

test('parseAlarmRequest parses relative minutes accurately', () => {
  const now = new Date('2026-11-17T09:00:00');
  const parsed = parseAlarmRequest('Set alarm in 10 minutes', now);
  assert.equal(parsed.triggerAt, now.getTime() + 10 * 60 * 1000);
});

test('shouldTriggerLiveSearch detects phone processor queries and real-time Google search triggers', () => {
  assert.equal(shouldTriggerLiveSearch('which phones have 4nm processor or 6nm processor'), true);
  assert.equal(shouldTriggerLiveSearch('google latest Snapdragon chips'), true);
  assert.equal(shouldTriggerLiveSearch('how are you?'), false);
  assert.equal(shouldTriggerLiveSearch('Turn on Wi-Fi'), false);
  assert.equal(shouldTriggerLiveSearch('hello', true), true);
});
