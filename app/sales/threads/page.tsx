'use client'
import { apiUrl } from '@/lib/api-url'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { salesResponseRowClass } from '@/lib/sales-response-row'

interface ProfiItem {
  id: string
  createdAt: string
  cost: number
  refundAmount: number
  status: string
  projectAmount: number | null
  notes: string | null
  updatedAt: string
}

interface ProfiStats {
  totalPaid: number
  totalRefunded: number
  netSpent: number
  totalResponses: number
  countResponse: number
  countConversation: number
  countProposal: number
  countPaid: number
  countRefunded: number
  countDrain: number
  totalProjectAmount: number
  roi: number
  responseToPaidRate: number
  costPerPayingClient: number | null
  avgCheckPaying: number | null
  funnel: {
    responses: number
    viewedResponses: number
    toConversation: number
    toProposal: number
    toPaid: number
    convRate: number
    proposalRate: number
    paidRate: number
  }
}

interface VisitInfo {
  total: number
  byMonth: Record<string, number>
}

// Порядок: отклик → просмотрено → переписка → КП → оплачено; выходы: возврат, слив
const STATUS_OPTIONS = [
  { value: 'response', label: 'Отклик' },
  { value: 'viewed', label: 'Просмотрено' },
  { value: 'conversation', label: 'Переписка' },
  { value: 'proposal', label: 'КП' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'refunded', label: 'Возврат' },
  { value: 'drain', label: 'Слив' },
]

export default function ThreadsPage() {
  const [items, setItems] = useState<ProfiItem[]>([])
  const [stats, setStats] = useState<ProfiStats | null>(null)
  const [byMonth, setByMonth] = useState<Record<string, ProfiStats>>({})
  const [visits, setVisits] = useState<VisitInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickCost, setQuickCost] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editProjectAmount, setEditProjectAmount] = useState('')
  const [editRefundAmount, setEditRefundAmount] = useState('')
  const fetchData = async () => {
    try {
      const res = await fetch(apiUrl('/api/agency/threads-responses?stats=1'))
      const data = await res.json()
      if (data.items !== undefined) {
        setItems(data.items)
        setStats(data.stats ?? null)
        setByMonth(data.byMonth ?? {})
        setVisits(data.visits ?? null)
      } else if (Array.isArray(data)) {
        setItems(data)
        setStats(null)
        setByMonth({})
        setVisits(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const key = 'pm_visit_debounce_threads'
      const now = Date.now()
      try {
        const last = typeof sessionStorage !== 'undefined' ? Number(sessionStorage.getItem(key) || 0) : 0
        if (typeof sessionStorage !== 'undefined' && now - last >= 30 * 60 * 1000) {
          sessionStorage.setItem(key, String(now))
          await fetch(apiUrl('/api/agency/platform-visits'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: 'threads' }),
          })
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) await fetchData()
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = quickCost.trim() ? parseFloat(quickCost.replace(',', '.')) : 0
    const cost = Number.isFinite(raw) && raw >= 0 ? raw : NaN
    if (isNaN(cost)) return
    setAdding(true)
    try {
      const res = await fetch(apiUrl('/api/agency/threads-responses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: quickCost.trim() ? cost : 0, notes: quickNotes || undefined }),
      })
      const json = await res.json()
      if (json.success && json.item) {
        setItems(prev => [json.item, ...prev])
        setQuickCost('')
        setQuickNotes('')
        fetchData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  const handleStatusChange = async (id: string, status: string, payload?: { refundAmount?: number; projectAmount?: number }) => {
    try {
      const res = await fetch(apiUrl(`/api/agency/threads-responses/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(payload?.refundAmount != null && { refundAmount: payload.refundAmount }),
          ...(payload?.projectAmount != null && { projectAmount: payload.projectAmount }),
        }),
      })
      const json = await res.json()
      if (json.success && json.item) {
        setItems(prev => prev.map(r => r.id === id ? json.item : r))
        fetchData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const openEdit = (item: ProfiItem) => {
    setEditingId(item.id)
    setEditRefundAmount(item.refundAmount ? String(item.refundAmount) : (item.status === 'refunded' ? String(item.cost) : ''))
    setEditProjectAmount(item.projectAmount != null ? String(item.projectAmount) : '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    const item = items.find(r => r.id === editingId)
    if (!item) return
    const refundNum = editRefundAmount ? parseFloat(editRefundAmount.replace(',', '.')) : 0
    const projectNum = editProjectAmount ? parseFloat(editProjectAmount.replace(',', '.')) : undefined
    await handleStatusChange(item.id, item.status, {
      refundAmount: item.status === 'refunded' ? refundNum : undefined,
      projectAmount: item.status === 'paid' ? (projectNum ?? 0) : undefined,
    })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот отклик?')) return
    try {
      const res = await fetch(apiUrl(`/api/agency/threads-responses/${id}`), { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setItems(prev => prev.filter(r => r.id !== id))
        fetchData()
      } else {
        alert(data.error || 'Ошибка удаления')
      }
    } catch (e) {
      console.error(e)
      alert('Ошибка удаления')
    }
  }

  if (loading) {
    return (
      <div className="text-[var(--muted-foreground)] py-8">Загрузка...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[var(--text)]">Threads — отклики</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Бесплатные отклики, та же воронка учёта, что и у Profi.</p>
        {visits != null && (
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Визитов на эту вкладку (учтено): <span className="font-semibold tabular-nums">{visits.total}</span>
            <span className="text-[var(--muted-foreground)] font-normal"> — не чаще 1 раза в 30 мин с браузера</span>
          </p>
        )}
      </div>

      {/* Экономика и конверсии (инфографика) */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Экономика</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Заплатил за отклики</span>
                <span className="font-medium">{stats.totalPaid.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Возвраты</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">−{stats.totalRefunded.toLocaleString('ru-RU')} ₽</span>
              </div>
              {stats.countDrain > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Сливов (отказ)</span>
                  <span className="font-medium text-[var(--muted-foreground)]">{stats.countDrain}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-[var(--text)] font-medium">Чистые расходы</span>
                <span className="font-semibold">{stats.netSpent.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Сумма проектов</span>
                <span className="font-medium text-[var(--primary)]">{stats.totalProjectAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-[var(--text)] font-medium">ROI</span>
                <span className={`font-semibold ${stats.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(0)}%
                </span>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              {stats.totalProjectAmount >= stats.netSpent
                ? 'Окупается: выручка по проектам больше расходов на отклики.'
                : 'Пока не окупается: расходы на отклики больше выручки по проектам.'}
            </p>
          </div>

          {/* Конверсии — логика: % от отклика в переписку → % от переписки в КП → % от КП в оплату */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Конверсии</h2>
            <div className="space-y-0">
              {/* 1. Количество откликов */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold">
                  {stats.funnel.responses}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text)]">Откликов</div>
                  <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden mt-0.5">
                    <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-0.5">
                <span className="text-[var(--muted-foreground)] text-lg">↓</span>
              </div>
              {/* 2. Просмотренные отклики (без возврата) */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--primary)]/75 text-white flex items-center justify-center text-sm font-bold">
                  {stats.funnel.viewedResponses}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] flex justify-between">
                    <span>Просмотренные отклики</span>
                    <span className="text-[var(--primary)] font-semibold tabular-nums">
                      {stats.funnel.responses > 0
                        ? `${Math.round((stats.funnel.viewedResponses / stats.funnel.responses) * 1000) / 10}% от отклика`
                        : '—'}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]/75 transition-all"
                      style={{ width: `${stats.funnel.responses > 0 ? Math.max((stats.funnel.viewedResponses / stats.funnel.responses) * 100, 2) : 2}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-0.5">
                <span className="text-[var(--muted-foreground)] text-lg">↓</span>
              </div>
              {/* 3. Переписка — % от отклика */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--primary)]/60 text-white flex items-center justify-center text-sm font-bold">
                  {stats.funnel.toConversation}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] flex justify-between">
                    <span>Переписка</span>
                    <span className="text-[var(--primary)] font-semibold tabular-nums">{stats.funnel.convRate}% от отклика</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]/60 transition-all"
                      style={{ width: `${Math.max(stats.funnel.convRate, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-0.5">
                <span className="text-[var(--muted-foreground)] text-lg">↓</span>
              </div>
              {/* 4. КП — % от переписки */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/80 text-sm font-bold text-[var(--primary-foreground)]">
                  {stats.funnel.toProposal}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm font-medium text-[var(--text)]">
                    <span>КП</span>
                    <span className="font-semibold tabular-nums text-[var(--primary)]">{stats.funnel.proposalRate}% от переписки</span>
                  </div>
                  <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]/80 transition-all"
                      style={{ width: `${Math.max(stats.funnel.convRate * (stats.funnel.proposalRate / 100), 2)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-0.5">
                <span className="text-[var(--muted-foreground)] text-lg">↓</span>
              </div>
              {/* 5. Оплачено — % от КП */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-sm font-bold text-white">
                  {stats.funnel.toPaid}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm font-medium text-[var(--text)]">
                    <span>Оплачено</span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{stats.funnel.paidRate}% от КП</span>
                  </div>
                  <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--success)] transition-all"
                      style={{ width: `${Math.max(stats.responseToPaidRate, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Итого от отклика в оплату + цена и чек платящего */}
            <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Итого от отклика в оплату</span>
                <span className="font-semibold text-[var(--primary)] tabular-nums">{stats.responseToPaidRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Цена платящего клиента</span>
                <span className="font-medium tabular-nums text-[var(--text)]">
                  {stats.costPerPayingClient != null
                    ? `${Math.round(stats.costPerPayingClient).toLocaleString('ru-RU')} ₽`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Средний чек платящего</span>
                <span className="font-medium tabular-nums text-[var(--text)]">
                  {stats.avgCheckPaying != null
                    ? `${Math.round(stats.avgCheckPaying).toLocaleString('ru-RU')} ₽`
                    : '—'}
                </span>
              </div>
            </div>
            {(stats.countDrain > 0 || stats.countRefunded > 0) && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
                {stats.countRefunded > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Возврат: {stats.countRefunded}
                  </span>
                )}
                {stats.countDrain > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--text)]">
                    Слив: {stats.countDrain}
                  </span>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              Узкое место — шаг с самым низким %.
            </p>
          </div>
        </div>
      )}

      {Object.keys(byMonth).length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4 overflow-x-auto">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-3">По месяцам (по дате отклика)</h2>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="py-2 pr-4 font-medium">Месяц</th>
                <th className="py-2 pr-4 font-medium">Откликов</th>
                <th className="py-2 pr-4 font-medium">Переписка+</th>
                <th className="py-2 pr-4 font-medium">Оплачено</th>
                <th className="py-2 pr-4 font-medium">Чистые расходы ₽</th>
                <th className="py-2 pr-4 font-medium">Визиты вкладки</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([ym, m]) => (
                  <tr key={ym} className="border-b border-[var(--border)]">
                    <td className="py-2 pr-4 font-medium text-[var(--text)]">{ym}</td>
                    <td className="py-2 pr-4 tabular-nums">{m.totalResponses}</td>
                    <td className="py-2 pr-4 tabular-nums">{m.funnel.toConversation}</td>
                    <td className="py-2 pr-4 tabular-nums">{m.countPaid}</td>
                    <td className="py-2 pr-4 tabular-nums">{Math.round(m.netSpent).toLocaleString('ru-RU')}</td>
                    <td className="py-2 pr-4 tabular-nums text-[var(--muted-foreground)]">{visits?.byMonth?.[ym] ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Добавить отклик — под экономикой */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Добавить отклик</h2>
        <form onSubmit={handleQuickAdd} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Стоимость (₽), обычно 0</label>
            <input
              type="text"
              inputMode="decimal"
              value={quickCost}
              onChange={e => setQuickCost(e.target.value)}
              placeholder="0"
              className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Заметка (необяз.)</label>
            <input
              type="text"
              value={quickNotes}
              onChange={e => setQuickNotes(e.target.value)}
              placeholder="Кратко о заявке"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50"
          >
            {adding ? '…' : 'Добавить'}
          </button>
        </form>
      </div>

      {/* Список откликов */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text)] p-4 border-b border-[var(--border)]">Отклики</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="py-3 px-4 font-medium">Дата</th>
                <th className="py-3 px-4 font-medium">Стоимость</th>
                <th className="py-3 px-4 font-medium">Статус</th>
                <th className="py-3 px-4 font-medium">Возврат</th>
                <th className="py-3 px-4 font-medium">Сумма проекта</th>
                <th className="py-3 px-4 font-medium">Заметка</th>
                <th className="py-3 px-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    Нет откликов. Добавьте первый выше.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={salesResponseRowClass(item.status)}>
                    <td className="py-2.5 px-4 whitespace-nowrap text-[var(--text)]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium">{item.cost.toLocaleString('ru-RU')} ₽</td>
                    <td className="py-2.5 px-4">
                      <select
                        value={item.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          if (newStatus === 'refunded') {
                            await handleStatusChange(item.id, newStatus, { refundAmount: item.cost })
                          } else if (newStatus === 'paid' && item.projectAmount == null) {
                            openEdit(item)
                            await handleStatusChange(item.id, newStatus)
                          } else {
                            await handleStatusChange(item.id, newStatus)
                          }
                        }}
                        className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)] bg-[var(--surface)] min-w-[120px]"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-4">
                      {editingId === item.id && item.status === 'refunded' ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editRefundAmount}
                          onChange={e => setEditRefundAmount(e.target.value)}
                          onBlur={saveEdit}
                          className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] tabular-nums"
                        />
                      ) : item.status === 'refunded' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{item.refundAmount.toLocaleString('ru-RU')} ₽</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {editingId === item.id && item.status === 'paid' ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editProjectAmount}
                          onChange={e => setEditProjectAmount(e.target.value)}
                          onBlur={saveEdit}
                          className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] tabular-nums"
                        />
                      ) : item.status === 'paid' && item.projectAmount != null ? (
                        <span className="font-medium text-[var(--primary)]">{item.projectAmount.toLocaleString('ru-RU')} ₽</span>
                      ) : item.status === 'paid' ? (
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="text-[var(--primary)] text-xs"
                        >
                          Указать сумму
                        </button>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--muted-foreground)] max-w-[180px] truncate" title={item.notes || ''}>
                      {item.notes || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {(item.status === 'refunded' && item.refundAmount !== item.cost) || (item.status === 'paid' && item.projectAmount == null) ? (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-[var(--primary)] text-xs font-medium"
                          >
                            Изменить
                          </button>
                        ) : (item.status === 'refunded' || item.status === 'paid') ? (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-[var(--muted-foreground)] text-xs"
                          >
                            Изменить
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 text-xs hover:text-red-800"
                          title="Удалить отклик"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
