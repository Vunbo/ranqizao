import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { MerchantPagePayload } from '../../types';

interface MerchantContentEditorProps {
  payload: MerchantPagePayload;
  onChange: (next: MerchantPagePayload) => void;
}

function normalizeItems(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const MerchantContentEditor = ({
  payload,
  onChange,
}: MerchantContentEditorProps) => {
  const updatePayload = (patch: Partial<MerchantPagePayload>) => {
    onChange({
      ...payload,
      ...patch,
    });
  };

  const updateCard = (
    index: number,
    patch: Partial<MerchantPagePayload['cards'][number]>
  ) => {
    const cards = payload.cards.map((card, currentIndex) =>
      currentIndex === index ? { ...card, ...patch } : card
    );

    updatePayload({ cards });
  };

  const addCard = () => {
    updatePayload({
      cards: [
        ...payload.cards,
        {
          id: `card-${Date.now()}`,
          title: '新卡片',
          badge: '',
          items: [],
          note: '',
        },
      ],
    });
  };

  const removeCard = (index: number) => {
    updatePayload({
      cards: payload.cards.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const moveCard = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset;

    if (nextIndex < 0 || nextIndex >= payload.cards.length) {
      return;
    }

    const cards = [...payload.cards];
    [cards[index], cards[nextIndex]] = [cards[nextIndex], cards[index]];
    updatePayload({ cards });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
            页面标题
          </label>
          <input
            type="text"
            value={payload.pageTitle}
            onChange={(event) => updatePayload({ pageTitle: event.target.value })}
            className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
            页面副标题
          </label>
          <input
            type="text"
            value={payload.pageSubtitle}
            onChange={(event) => updatePayload({ pageSubtitle: event.target.value })}
            className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
          申请提示
        </label>
        <textarea
          value={payload.applyNotice}
          onChange={(event) => updatePayload({ applyNotice: event.target.value })}
          rows={3}
          className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
              卡片内容
            </h4>
            <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
              每张卡片对应 App 端一个内容模块，发布顺序以这里从上到下为准
            </p>
          </div>
          <button
            onClick={addCard}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/40 px-4 py-2 text-[10px] font-mono font-bold text-brand transition-all hover:bg-brand/10"
          >
            <Plus className="w-4 h-4" />
            新增卡片
          </button>
        </div>

        <div className="space-y-4">
          {payload.cards.map((card, index) => (
            <div
              key={card.id}
              className="rounded-3xl border border-border-subtle bg-black/20 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                  卡片 {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveCard(index, -1)}
                    disabled={index === 0}
                    className="rounded-xl border border-border-subtle p-2 text-text-secondary transition-all hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                    title="上移卡片"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveCard(index, 1)}
                    disabled={index === payload.cards.length - 1}
                    className="rounded-xl border border-border-subtle p-2 text-text-secondary transition-all hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                    title="下移卡片"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeCard(index)}
                    className="rounded-xl border border-danger/30 p-2 text-danger transition-all hover:bg-danger/10"
                    title="删除卡片"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    卡片标题
                  </label>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(event) => updateCard(index, { title: event.target.value })}
                    className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    价格角标
                  </label>
                  <input
                    type="text"
                    value={card.badge}
                    onChange={(event) => updateCard(index, { badge: event.target.value })}
                    className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                  列表内容
                </label>
                <textarea
                  value={card.items.join('\n')}
                  onChange={(event) =>
                    updateCard(index, { items: normalizeItems(event.target.value) })
                  }
                  rows={6}
                  className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
                />
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  一行一条
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                  备注
                </label>
                <textarea
                  value={card.note}
                  onChange={(event) => updateCard(index, { note: event.target.value })}
                  rows={2}
                  className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border-subtle bg-black/20 p-6 space-y-4">
        <div>
          <h4 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
            联系方式
          </h4>
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
            App 端“联系我们”弹层展示这里的内容
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
              模块标题
            </label>
            <input
              type="text"
              value={payload.contact.title}
              onChange={(event) =>
                updatePayload({
                  contact: { ...payload.contact, title: event.target.value },
                })
              }
              className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
              联系电话
            </label>
            <input
              type="text"
              value={payload.contact.phone}
              onChange={(event) =>
                updatePayload({
                  contact: { ...payload.contact, phone: event.target.value },
                })
              }
              className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
              微信
            </label>
            <input
              type="text"
              value={payload.contact.wechat}
              onChange={(event) =>
                updatePayload({
                  contact: { ...payload.contact, wechat: event.target.value },
                })
              }
              className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
              联系地址
            </label>
            <input
              type="text"
              value={payload.contact.address}
              onChange={(event) =>
                updatePayload({
                  contact: { ...payload.contact, address: event.target.value },
                })
              }
              className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
            备注说明
          </label>
          <textarea
            value={payload.contact.note}
            onChange={(event) =>
              updatePayload({
                contact: { ...payload.contact, note: event.target.value },
              })
            }
            rows={3}
            className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50"
          />
        </div>
      </div>
    </div>
  );
};
