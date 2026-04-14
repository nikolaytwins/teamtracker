'use client'
import { apiUrl, appPath } from '@/lib/api-url'
import Link from 'next/link'

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

const STATUS_OPTIONS = [
  { value: 'response', label: 'Отклик' },
  { value: 'viewed', label: 'Просмотрено' },
  { value: 'conversation', label: 'Переписка' },
  { value: 'proposal', label: 'КП' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'refunded', label: 'Возврат' },
  { value: 'drain', label: 'Слив' },
]

export default function ProfiPage() {
  const [items, setItems] = useState<ProfiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [quickCost, setQuickCost] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editProjectAmount, setEditProjectAmount] = useState('')
  const [editRefundAmount, setEditRefundAmount] = useState('')

  const fetchItems = async () => {
    try {
      const res = await fetch(apiUrl('/api/agency/profi-responses'))
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchItems()
  }, [])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const cost = parseFloat(quickCost.replace(',', '.'))
    if (isNaN(cost) || cost < 0) return
    setAdding(true)
    try {
      const res = await fetch(apiUrl('/api/agency/profi-responses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost, notes: quickNotes || undefined }),
      })
      const json = await res.json()
      if (json.success && json.item) {
        setItems(prev => [json.item, ...prev])
        setQuickCost('')
        setQuickNotes('')
        void fetchItems()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  const handleStatusChange = async (id: string, status: string, payload?: { refundAmount?: number; projectAmount?: number }) => {
    try {
      const res = await fetch(apiUrl(`/api/agency/profi-responses/${id}`), {
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
        void fetchItems()
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
      const res = await fetch(apiUrl(`/api/agency/profi-responses/${id}`), { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setItems(prev => prev.filter(r => r.id !== id))
        void fetchItems()
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Profi.ru</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Быстрый ввод и список откликов. Экономика и воронка — в{' '}
            <Link href={appPath('/sales/analytics#profi')} className="font-semibold text-[var(--primary)] hover:underline">
              аналитике
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Добавить отклик</h2>
        <form onSubmit={handleQuickAdd} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Стоимость отклика (₽)</label>
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
            disabled={adding || !quickCost.trim()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50"
          >
            {adding ? '…' : 'Добавить'}
          </button>
        </form>
      </div>

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
