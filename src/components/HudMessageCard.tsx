import { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Phone,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from 'lucide-react';
import { SYSTEM_NAME } from '../lib/memoryStore';
import type { HudMessage, PendingAction } from '../types/jarvis';
import { BreathingGuide } from './BreathingGuide';

interface HudMessageCardProps {
  message: HudMessage;
  userLabel: string;
  onResolveAction: (
    messageId: string,
    action: PendingAction,
    decision: 'authorize-once' | 'always-allow' | 'deny',
    overridePhone?: string
  ) => void;
}

const SOURCE_TEXT: Record<NonNullable<HudMessage['source']>, string> = {
  'offline-core': 'Offline Core',
  'webgpu-local': 'WebGPU Local',
  'ollama-local': 'Local 2B Model',
  'cloud-gemini': 'Cloud AI',
  'cloud-research': 'Live Web Search',
  'permission-gate': 'Permission Vault',
};

export function HudMessageCard({
  message,
  userLabel,
  onResolveAction,
}: HudMessageCardProps) {
  const isUser = message.role === 'user';
  const action = message.pendingAction;

  const [phoneInput, setPhoneInput] = useState(
    action?.payload?.phoneNumber ? String(action.payload.phoneNumber) : ''
  );

  const timeFormatted = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      className={`flex flex-col gap-1.5 py-3 border-b border-white/[0.06] last:border-b-0 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-[#7E92A4]">
        <span className={`font-medium ${isUser ? 'text-[#CBD5E1]' : 'text-[#38BDF8]'}`}>
          {isUser ? userLabel : SYSTEM_NAME}
        </span>
        <span aria-hidden="true">·</span>
        <time className="font-mono-tabular">{timeFormatted}</time>
        {!isUser && message.source && (
          <>
            <span aria-hidden="true">·</span>
            <span>{SOURCE_TEXT[message.source]}</span>
          </>
        )}
      </div>

      <div
        className={`max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
          isUser
            ? 'bg-[#121923]/95 text-[#E8EEF3] border border-white/10'
            : 'bg-[#0B0F15]/90 text-[#E8EEF3] border border-white/[0.07]'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>

        {/* Inline English Fluency Tip */}
        {message.coachingTip &&
          (message.coachingTip.naturalPhrase || message.coachingTip.tip) && (
            <div className="mt-3 pt-3 border-t border-white/[0.08] text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[#38BDF8] font-medium">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Natural English Tip</span>
              </div>
              {message.coachingTip.naturalPhrase && (
                <p className="text-[#E2E8F0]">
                  Smoother phrasing:{' '}
                  <span className="text-[#7DD3FC] font-medium">
                    &ldquo;{message.coachingTip.naturalPhrase}&rdquo;
                  </span>
                </p>
              )}
              {message.coachingTip.tip && (
                <p className="text-[#94A3B8]">{message.coachingTip.tip}</p>
              )}
            </div>
          )}

        {/* Inline Guided Breathing when emotional stress is detected */}
        {message.showBreathingTool && (
          <div className="mt-3 pt-3 border-t border-white/[0.08]">
            <BreathingGuide />
          </div>
        )}

        {/* Live Web Search Citations */}
        {message.groundingLinks && message.groundingLinks.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex flex-wrap gap-3 text-xs">
            {message.groundingLinks.map((link, i) => (
              <a
                key={`${link.uri}-${i}`}
                href={link.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#7DD3FC] hover:underline"
              >
                <span className="truncate max-w-[210px]">{link.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

        {/* Permission Gate Action Card */}
        {action && (
          <div
            data-testid={`permission-card-${action.id}`}
            className="mt-3 pt-3 border-t border-white/[0.09] flex flex-col gap-3"
          >
            <div className="flex items-start gap-2.5">
              {action.status === 'pending' && (
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              {action.status === 'approved' && (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              {(action.status === 'denied' || action.status === 'blocked') && (
                <ShieldX className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#E8EEF3]">{action.title}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{action.detail}</p>
              </div>
            </div>

            {action.status === 'pending' && (
              <>
                {action.type === 'dial_contact' && (
                  <label className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    <Phone className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                    <span className="sr-only">Confirm phone number</span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Confirm phone digits (e.g. +15550199)"
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#06080C] border border-white/15 text-sm text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                    />
                  </label>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onResolveAction(message.id, action, 'authorize-once', phoneInput)
                    }
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#38BDF8] text-[#06080C] text-xs font-semibold hover:bg-[#7DD3FC] transition-colors whitespace-nowrap"
                  >
                    Authorize Once
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onResolveAction(message.id, action, 'always-allow', phoneInput)
                    }
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#121923] border border-white/15 text-[#E8EEF3] text-xs font-medium hover:border-[#38BDF8]/50 transition-colors whitespace-nowrap"
                  >
                    Always Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveAction(message.id, action, 'deny')}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-transparent border border-rose-400/30 text-rose-300 text-xs font-medium hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                  >
                    Deny
                  </button>
                </div>
              </>
            )}

            {action.status === 'approved' && (
              <div className="flex items-center justify-between gap-2 text-xs text-emerald-300">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Authorized &amp; executed</span>
                </span>
                {action.type === 'open_app' && action.payload.url && (
                  <a
                    href={String(action.payload.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#7DD3FC] hover:underline"
                  >
                    <span>Open {String(action.payload.appName || 'App')}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
                {action.type === 'dial_contact' && action.payload.phoneNumber && (
                  <a
                    href={`tel:${String(action.payload.phoneNumber)}`}
                    className="inline-flex items-center gap-1 text-[#7DD3FC] hover:underline"
                  >
                    <span>Dial {String(action.payload.phoneNumber)}</span>
                    <Phone className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}

            {action.status === 'denied' && (
              <p className="text-xs text-rose-300">
                Action declined — permission respected.
              </p>
            )}

            {action.status === 'blocked' && (
              <p className="text-xs text-rose-300">
                Blocked by Permission Vault policy (Denied).
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
