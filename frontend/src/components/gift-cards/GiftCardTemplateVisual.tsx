import { Cake, Flower2, Gem, Gift, Sparkles, Stars } from 'lucide-react';
import type { GiftCard, GiftCardClaimPreview, GiftCardTemplate } from '../../services/gift-cards.service';

const iconMap = {
  sparkles: Sparkles,
  cake: Cake,
  lotus: Stars,
  confetti: Gift,
  flower: Flower2,
  gem: Gem,
} as const;

type VisualPayload = {
  balance: number;
  template: GiftCardTemplate;
  message?: string | null;
  cardNumber?: string | null;
  badge?: string;
};

export function renderGiftCardVisualPayload(card: GiftCard): VisualPayload {
  return {
    balance: card.balance,
    template: card.template,
    message: card.recipient_message,
    cardNumber: card.card_number,
    badge: card.status === 'pending_transfer' ? 'Pending transfer' : card.template.name,
  };
}

export function renderGiftCardPreviewPayload(preview: GiftCardClaimPreview): VisualPayload {
  return {
    balance: preview.amount,
    template: preview.template,
    message: preview.recipient_message,
    badge: 'Gift preview',
  };
}

export function GiftCardTemplateVisual({ payload, className = '' }: { payload: VisualPayload; className?: string }) {
  const Icon = iconMap[payload.template.icon_key as keyof typeof iconMap] ?? Sparkles;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.35)] ${className}`.trim()}
      style={{
        background: `linear-gradient(135deg, ${payload.template.background_start_hex} 0%, ${payload.template.background_end_hex} 100%)`,
        color: payload.template.text_hex,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at top left, ${payload.template.accent_start_hex}44 0%, transparent 38%), radial-gradient(circle at bottom right, ${payload.template.accent_end_hex}33 0%, transparent 45%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70"
        style={{
          background: `linear-gradient(180deg, ${payload.template.accent_start_hex}26 0%, transparent 100%)`,
        }}
      />

      <div className="relative flex h-full min-h-[220px] flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-75">NailsDash Gift Card</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{payload.badge ?? payload.template.name}</p>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10"
            style={{ background: `${payload.template.accent_start_hex}22` }}
          >
            <Icon className="h-5 w-5" style={{ color: payload.template.accent_start_hex }} />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">Available Balance</p>
          <div className="mt-2 flex items-start gap-1">
            <span className="mt-1 text-xl font-black" style={{ color: payload.template.accent_start_hex }}>$</span>
            <span className="text-5xl font-black italic leading-none tracking-tight">{payload.balance.toFixed(2)}</span>
          </div>
          {payload.message ? (
            <p className="mt-4 max-w-[20rem] text-sm leading-relaxed opacity-90">“{payload.message}”</p>
          ) : (
            <p className="mt-4 text-sm opacity-60">A little luxury, ready whenever you are.</p>
          )}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div />
          {payload.cardNumber ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right font-mono text-xs tracking-[0.24em] opacity-90">
              {payload.cardNumber}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
