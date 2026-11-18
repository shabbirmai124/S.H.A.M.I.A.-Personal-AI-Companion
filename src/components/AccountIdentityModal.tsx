import { useState, type FormEvent } from 'react';
import { UserCheck, X } from 'lucide-react';
import { SYSTEM_NAME } from '../lib/memoryStore';
import type { UserIdentityProfile } from '../types/shamia';

interface AccountIdentityModalProps {
  identity: UserIdentityProfile;
  onSave: (next: UserIdentityProfile) => void;
  onClose: () => void;
}

const ADDRESS_PRESETS = ['Sir', 'Md Shabbir Mia', 'Shabbir', 'Mia'];

export function AccountIdentityModal({
  identity,
  onSave,
  onClose,
}: AccountIdentityModalProps) {
  const [fullName, setFullName] = useState(identity.fullName);
  const [addressAs, setAddressAs] = useState(identity.addressAs);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      fullName: fullName.trim() || 'Md Shabbir Mia',
      addressAs: addressAs.trim() || 'Sir',
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0B0F14] border border-white/10 shadow-2xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="account-modal-title"
              className="font-display text-lg font-semibold text-[#E8EEF3]"
            >
              Profile Settings
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Manage your account name and preferred form of address.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-full-name" className="text-xs font-medium text-[#CBD5E1]">
              Account Name
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Md Shabbir Mia"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#06080C] border border-white/10 text-sm text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-address-as" className="text-xs font-medium text-[#CBD5E1]">
              How {SYSTEM_NAME} Addresses You
            </label>
            <input
              id="profile-address-as"
              type="text"
              value={addressAs}
              onChange={(e) => setAddressAs(e.target.value)}
              placeholder="Sir"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#06080C] border border-white/10 text-sm text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
            />
            <div className="flex flex-wrap gap-1.5">
              {ADDRESS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAddressAs(preset)}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    addressAs === preset
                      ? 'bg-[#38BDF8]/18 text-[#38BDF8] border border-[#38BDF8]/35'
                      : 'bg-[#06080C] text-[#94A3B8] border border-white/[0.08] hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#38BDF8] text-[#06080C] text-xs font-semibold hover:bg-[#7DD3FC] transition-colors inline-flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
