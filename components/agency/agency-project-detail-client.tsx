'use client'
import { apiUrl, appPath } from '@/lib/api-url'
import type { AgencyFinanceVariant } from '@/lib/agency/finance-paths'
import { AGENCY_FINANCE_PATHS } from '@/lib/agency/finance-paths'
import {
  agencyDetailEffectiveSeconds,
  agencyDetailLineTotal,
  agencyDetailSessionElapsedSeconds,
  formatAgencyDetailClock,
  formatAgencyDetailHours,
} from '@/lib/agency/detail-line-total'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Project {
  id: string
  name: string
  totalAmount: number
  paidAmount: number
  deadline: string | null
  status: string
  serviceType: string
  businessLine?: string
  clientType: string | null
  paymentMethod: string | null
  clientContact: string | null
  notes: string | null
  source_lead_id?: string | null
  hourlyRateRub?: number
  createdAt: string
}

interface Expense {
  id: string
  employeeName: string
  employeeRole: string
  amount: number
  notes: string | null
}

interface ProjectDetail {
  id: string
  title: string
  quantity: number
  unitPrice: number
  order: number
  billingType?: 'fixed' | 'hourly'
  trackedSeconds?: number
  timerStartedAt?: string | null
}

function ExpenseRow({
  expense,
  roleLabels,
  onUpdate,
  onDelete,
}: {
  expense: Expense
  roleLabels: Record<string, string>
  onUpdate: (id: string, field: string, value: string | number | null) => void
  onDelete: (id: string) => void
}) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState('')

  const handleStartEdit = (field: string, currentValue: string | number | null) => {
    setEditingField(field)
    setTempValue(currentValue?.toString() || '')
  }

  const handleSave = (field: string) => {
    let value: string | number | null = tempValue
    if (field === 'amount') {
      value = parseFloat(tempValue) || 0
    }
    onUpdate(expense.id, field, value)
    setEditingField(null)
  }

  const handleCancel = () => {
    setEditingField(null)
    setTempValue('')
  }

  const roleOptions = [
    { value: 'designer', label: 'Дизайнер' },
    { value: 'pm', label: 'Проджект' },
    { value: 'copywriter', label: 'Копирайтер' },
    { value: 'assistant', label: 'Ассистент' },
  ]

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">
        {editingField === 'employeeName' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => handleSave('employeeName')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave('employeeName')
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
            className="w-full px-2 py-1 border border-[var(--primary)] rounded text-sm"
          />
        ) : (
          <button
            onClick={() => handleStartEdit('employeeName', expense.employeeName)}
            className="cursor-pointer hover:bg-[var(--surface-2)] px-2 py-1 rounded text-left"
          >
            {expense.employeeName}
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
        {editingField === 'employeeRole' ? (
          <select
            value={tempValue}
            onChange={(e) => {
              setTempValue(e.target.value)
              handleSave('employeeRole')
            }}
            onBlur={() => setEditingField(null)}
            autoFocus
            className="w-full px-2 py-1 border border-[var(--primary)] rounded text-sm"
          >
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => handleStartEdit('employeeRole', expense.employeeRole)}
            className="cursor-pointer hover:bg-[var(--surface-2)] px-2 py-1 rounded"
          >
            {roleLabels[expense.employeeRole] || expense.employeeRole}
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-[var(--text)]">
        {editingField === 'amount' ? (
          <input
            type="number"
            step="0.01"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => handleSave('amount')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave('amount')
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
            className="w-24 px-2 py-1 border border-[var(--primary)] rounded text-sm text-right"
          />
        ) : (
          <button
            onClick={() => handleStartEdit('amount', expense.amount)}
            className="cursor-pointer hover:bg-[var(--surface-2)] px-2 py-1 rounded text-right"
          >
            {expense.amount.toLocaleString('ru-RU')} ₽
          </button>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">
        {editingField === 'notes' ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => handleSave('notes')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave('notes')
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
            className="w-full px-2 py-1 border border-[var(--primary)] rounded text-sm"
          />
        ) : (
          <button
            onClick={() => handleStartEdit('notes', expense.notes || '')}
            className="cursor-pointer hover:bg-[var(--surface-2)] px-2 py-1 rounded text-left w-full"
          >
            {expense.notes || '—'}
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onDelete(expense.id)}
          className="text-red-600 hover:text-red-900"
        >
          Удалить
        </button>
      </td>
    </tr>
  )
}

export function AgencyProjectDetailClient({ variant }: { variant: AgencyFinanceVariant }) {
  const paths = AGENCY_FINANCE_PATHS[variant]
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { apiBase } = paths

  const [project, setProject] = useState<Project | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [details, setDetails] = useState<ProjectDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [addBillingType, setAddBillingType] = useState<'fixed' | 'hourly'>('fixed')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [hourlyRateDraft, setHourlyRateDraft] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, expensesRes, detailsRes] = await Promise.all([
        fetch(apiUrl(`${apiBase}/projects`)).then(r => r.json()),
        fetch(apiUrl(`${apiBase}/expenses?projectId=${id}`)).then(r => r.json()),
        fetch(apiUrl(`${apiBase}/project-details?projectId=${id}`)).then(r => r.json()),
      ])
      
      const proj = projectRes.find((p: Project) => p.id === id)
      setProject(proj || null)
      if (proj) setHourlyRateDraft(String(Number(proj.hourlyRateRub) || 0))
      setExpenses(expensesRes)
      setDetails(Array.isArray(detailsRes) ? detailsRes : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [id, apiBase])

  useEffect(() => {
    if (id) {
      void fetchData()
    }
  }, [id, fetchData])

  useEffect(() => {
    const hasRunning = details.some((d) => d.billingType === 'hourly' && d.timerStartedAt)
    if (!hasRunning) return
    const t = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [details])

  const handleAddDetail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = (formData.get('title') as string || '').trim()
    const quantity = parseFloat((formData.get('quantity') as string) || '1')
    const unitPrice = parseFloat((formData.get('unitPrice') as string) || '0')

    if (!title) return

    const data = {
      projectId: id,
      title,
      billingType: addBillingType,
      quantity: addBillingType === 'hourly' ? 1 : isNaN(quantity) ? 1 : quantity,
      unitPrice: addBillingType === 'hourly' ? 0 : isNaN(unitPrice) ? 0 : unitPrice,
      order: details.length,
    }

    try {
      const res = await fetch(apiUrl(`${apiBase}/project-details`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.detail) {
          setDetails([json.detail, ...details])
        } else {
          fetchData()
        }
        ;(e.currentTarget as HTMLFormElement).reset()
        setAddBillingType('fixed')
      }
    } catch (error) {
      console.error('Error adding project detail:', error)
    }
  }

  const handleUpdateDetail = (detailId: string, field: 'title' | 'quantity' | 'unitPrice') => {
    return async (value: string) => {
      const current = details.find(d => d.id === detailId)
      if (!current) return

      const next: Partial<ProjectDetail> =
        field === 'title'
          ? { title: value }
          : field === 'quantity'
            ? (() => {
                const q = parseFloat(value.replace(',', '.'))
                return { quantity: isNaN(q) ? current.quantity : q }
              })()
            : (() => {
                const p = parseFloat(value.replace(',', '.'))
                return { unitPrice: isNaN(p) ? current.unitPrice : p }
              })()

      const updated: ProjectDetail = { ...current, ...next }
      setDetails(details.map(d => d.id === detailId ? updated : d))

      try {
        const res = await fetch(apiUrl(`${apiBase}/project-details/${detailId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
        if (!res.ok) {
          console.error('Failed to update project detail')
          fetchData()
        }
      } catch (error) {
        console.error('Error updating project detail:', error)
        fetchData()
      }
    }
  }

  const handleDeleteDetail = async (detailId: string) => {
    if (!confirm('Удалить строку детализации?')) return
    const prev = details
    setDetails(details.filter(d => d.id !== detailId))
    try {
      const res = await fetch(apiUrl(`${apiBase}/project-details/${detailId}`), {
        method: 'DELETE',
      })
      if (!res.ok) {
        console.error('Failed to delete project detail')
        setDetails(prev)
      }
    } catch (error) {
      console.error('Error deleting project detail:', error)
      setDetails(prev)
    }
  }

  const handleDetailTimer = async (detailId: string, action: 'start' | 'stop') => {
    try {
      const res = await fetch(apiUrl(`${apiBase}/project-details/${detailId}/timer`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        console.error('Failed to toggle timer')
        return
      }
      const json = await res.json()
      if (json.detail) {
        setDetails((prev) => prev.map((d) => (d.id === detailId ? { ...d, ...json.detail } : d)))
        setNowMs(Date.now())
      } else {
        fetchData()
      }
    } catch (error) {
      console.error('Error toggling timer:', error)
    }
  }

  const handleSaveHourlyRate = async () => {
    if (!project) return
    const rate = parseFloat(hourlyRateDraft.replace(',', '.'))
    if (isNaN(rate) || rate < 0) return
    setSavingRate(true)
    try {
      const res = await fetch(apiUrl(`${apiBase}/projects/${project.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          totalAmount: project.totalAmount,
          paidAmount: project.paidAmount,
          deadline: project.deadline,
          status: project.status,
          serviceType: project.serviceType,
          businessLine: project.businessLine ?? 'agency',
          clientType: project.clientType,
          paymentMethod: project.paymentMethod,
          clientContact: project.clientContact,
          notes: project.notes,
          hourlyRateRub: rate,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.project) {
          setProject({ ...project, ...json.project, hourlyRateRub: rate })
        } else {
          setProject({ ...project, hourlyRateRub: rate })
        }
      }
    } catch (error) {
      console.error('Error saving hourly rate:', error)
    } finally {
      setSavingRate(false)
    }
  }

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      projectId: id,
      employeeName: formData.get('employeeName'),
      employeeRole: formData.get('employeeRole'),
      amount: parseFloat(formData.get('amount') as string),
      notes: formData.get('notes') || null,
    }

    try {
      const res = await fetch(apiUrl(`${apiBase}/expenses`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setShowExpenseForm(false)
        fetchData()
        router.refresh()
      }
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Удалить расход?')) return
    
    try {
      const res = await fetch(apiUrl(`${apiBase}/expenses/${expenseId}`), {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const handleUpdateExpense = async (
    expenseId: string,
    field: string,
    value: string | number | null
  ) => {
    try {
      const expense = expenses.find(e => e.id === expenseId)
      if (!expense) return

      const updatedExpense = { ...expense, [field]: value }
      
      // Optimistic update
      setExpenses(expenses.map(e => e.id === expenseId ? updatedExpense : e))
      
      const res = await fetch(apiUrl(`${apiBase}/expenses/${expenseId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedExpense),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.expense) {
          setExpenses(expenses.map(e => e.id === expenseId ? data.expense : e))
        }
      } else {
        // Revert on error
        fetchData()
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Загрузка...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <div className="mb-6">
          <Link href={appPath(paths.listHref)} className="text-[var(--primary)] hover:underline text-sm">
            ← Назад к проектам
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Проект не найден
        </div>
      </div>
    )
  }

  const hourlyRate = Number(project.hourlyRateRub) || 0
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalDetailsAmount = details.reduce(
    (sum, d) =>
      sum +
      agencyDetailLineTotal(
        {
          billingType: d.billingType,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          trackedSeconds: agencyDetailEffectiveSeconds(
            { trackedSeconds: d.trackedSeconds, timerStartedAt: d.timerStartedAt },
            nowMs
          ),
        },
        hourlyRate
      ),
    0
  )
  // Если есть детализация — она приоритетнее ручного totalAmount
  const effectiveTotalAmount = details.length > 0 ? totalDetailsAmount : project.totalAmount
  const profit = effectiveTotalAmount - totalExpenses

  const serviceLabels: Record<string, string> = {
    site: 'Сайт',
    presentation: 'Презентация',
    small_task: 'Мелкая задача',
    subscription: 'Подписка',
    ai_development: 'AI-разработка',
  }

  const paymentMethodLabels: Record<string, string> = {
    card: 'Карта',
    account: 'Расчетный счет',
  }

  const statusLabels: Record<string, string> = {
    not_paid: 'Не оплачен',
    prepaid: 'Предоплата',
    paid: 'Оплачен',
  }

  const clientTypeLabels: Record<string, string> = {
    permanent: 'Постоянник',
    referral: 'Рекомендация',
    profi_ru: 'Профи.ру',
    networking: 'Нетворкинг',
  }

  const roleLabels: Record<string, string> = {
    designer: 'Дизайнер',
    pm: 'Проджект',
    copywriter: 'Копирайтер',
    assistant: 'Ассистент',
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={appPath(paths.listHref)} className="text-[var(--primary)] hover:underline text-sm">
          ← Назад к проектам
        </Link>
      </div>

      {/* Детализация для клиента */}
      <div className="bg-[var(--surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border)] p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Детализация для клиента</h2>
          {totalDetailsAmount > 0 && (
            <div className="text-sm text-[var(--text)]">
              Итого по детализации:{' '}
              <span className="font-semibold">
                {totalDetailsAmount.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleAddDetail} className="mb-4 bg-[var(--surface-2)] rounded-lg p-4">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAddBillingType('fixed')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                addBillingType === 'fixed'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface)] text-[var(--muted-foreground)] border border-[var(--border)]'
              }`}
            >
              Фикс
            </button>
            <button
              type="button"
              onClick={() => setAddBillingType('hourly')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                addBillingType === 'hourly'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface)] text-[var(--muted-foreground)] border border-[var(--border)]'
              }`}
            >
              По времени
            </button>
          </div>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-6">
              <label className="block text-xs font-medium text-[var(--text)] mb-1">Задача / услуга</label>
              <input
                name="title"
                type="text"
                placeholder="Например: Обложки для рилс"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--text)] mb-1">Кол-во</label>
              <input
                name="quantity"
                type="number"
                step="0.01"
                defaultValue="1"
                disabled={addBillingType === 'hourly'}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm text-right disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-40"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--text)] mb-1">Стоимость</label>
              <input
                name="unitPrice"
                type="number"
                step="0.01"
                disabled={addBillingType === 'hourly'}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm text-right disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-40"
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium hover:brightness-110"
              >
                Добавить
              </button>
            </div>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--surface-2)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase">Задача</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase">Кол-во / часы</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase">Стоимость</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase">Итого</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
              {details.map((d) => {
                const isHourly = d.billingType === 'hourly'
                const liveSeconds = isHourly
                  ? agencyDetailEffectiveSeconds(
                      { trackedSeconds: d.trackedSeconds, timerStartedAt: d.timerStartedAt },
                      nowMs
                    )
                  : 0
                const sessionSeconds = isHourly
                  ? agencyDetailSessionElapsedSeconds(d.timerStartedAt, nowMs)
                  : 0
                const fixedSeconds = Math.max(0, Number(d.trackedSeconds) || 0)
                const lineTotal = agencyDetailLineTotal(
                  {
                    billingType: d.billingType,
                    quantity: d.quantity,
                    unitPrice: d.unitPrice,
                    trackedSeconds: liveSeconds,
                  },
                  hourlyRate
                )
                const running = Boolean(d.timerStartedAt)
                return (
                  <tr key={d.id} className={running ? 'bg-emerald-50/40' : undefined}>
                    <td className="px-6 py-3 text-sm">
                      <input
                        type="text"
                        defaultValue={d.title}
                        onBlur={(e) => handleUpdateDetail(d.id, 'title')(e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-[var(--border)] rounded-md text-sm"
                      />
                      {isHourly ? (
                        <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">По времени</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {isHourly ? (
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`font-mono text-[20px] font-semibold tabular-nums leading-none tracking-tight ${
                              running ? 'text-emerald-700' : 'text-[var(--text)]'
                            }`}
                          >
                            {formatAgencyDetailClock(liveSeconds)}
                          </div>
                          {running ? (
                            <div className="text-[11px] text-emerald-700">
                              Идёт · сессия {formatAgencyDetailClock(sessionSeconds)}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[var(--muted-foreground)]">
                              {fixedSeconds > 0
                                ? `На паузе · ${formatAgencyDetailHours(fixedSeconds)}`
                                : 'Ещё не запускали'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={d.quantity}
                            onBlur={(e) => handleUpdateDetail(d.id, 'quantity')(e.target.value)}
                            className="w-24 px-2 py-1 border border-transparent hover:border-[var(--border)] rounded-md text-sm text-right"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {isHourly ? (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={d.unitPrice}
                          onBlur={(e) => handleUpdateDetail(d.id, 'unitPrice')(e.target.value)}
                          className="w-28 px-2 py-1 border border-transparent hover:border-[var(--border)] rounded-md text-sm text-right"
                        />
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-medium">
                      {lineTotal.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isHourly ? (
                          <button
                            type="button"
                            onClick={() => void handleDetailTimer(d.id, running ? 'stop' : 'start')}
                            className={`inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              running
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {running ? (
                              <>
                                <span aria-hidden>❚❚</span> Пауза
                              </>
                            ) : (
                              <>
                                <span aria-hidden>▶</span> {fixedSeconds > 0 ? 'Продолжить' : 'Старт'}
                              </>
                            )}
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeleteDetail(d.id)}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {details.length > 0 && (
                <tr className="bg-[var(--primary-soft)]">
                  <td className="px-6 py-3 text-sm font-semibold text-[var(--text)]">ИТОГО</td>
                  <td />
                  <td />
                  <td className="px-6 py-3 text-sm font-bold text-right text-[var(--text)]">
                    {totalDetailsAmount.toLocaleString('ru-RU')} ₽
                  </td>
                  <td />
                </tr>
              )}
              {details.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-[var(--muted-foreground)]">
                    Детализация пока не добавлена
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Стоимость часа проекта</div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Ставка используется для почасовых задач. В списке строк для клиента не показывается — только часы и итого.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text)]">₽ / час</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRateDraft}
                onChange={(e) => setHourlyRateDraft(e.target.value)}
                className="w-40 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-right"
              />
            </div>
            <button
              type="button"
              disabled={savingRate}
              onClick={() => void handleSaveHourlyRate()}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
            >
              {savingRate ? 'Сохранение…' : 'Сохранить ставку'}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">{project.name}</h1>
        {project.deadline && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Дедлайн: {formatDate(new Date(project.deadline))}</p>
        )}
        {project.source_lead_id ? (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Лид:{" "}
            <Link href={`/sales/leads#lead-${project.source_lead_id}`} className="hover:underline">
              открыть в воронке
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border)] p-4">
          <div className="text-sm text-[var(--muted-foreground)] mb-1">Сумма проекта</div>
          <div className="text-xl font-bold text-[var(--text)]">
            {effectiveTotalAmount.toLocaleString('ru-RU')} ₽
          </div>
          {details.length > 0 && effectiveTotalAmount !== project.totalAmount && (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              По детализации (ручное значение: {project.totalAmount.toLocaleString('ru-RU')} ₽)
            </div>
          )}
        </div>
        <div className="bg-[var(--surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border)] p-4">
          <div className="text-sm text-[var(--muted-foreground)] mb-1">Оплачено</div>
          <div className="text-xl font-bold text-green-600">{project.paidAmount.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="bg-[var(--surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border)] p-4">
          <div className="text-sm text-[var(--muted-foreground)] mb-1">Расходы</div>
          <div className="text-xl font-bold text-red-600">{totalExpenses.toLocaleString('ru-RU')} ₽</div>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border)] p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Услуга</div>
            <div className="font-medium">{serviceLabels[project.serviceType] || project.serviceType}</div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Направление</div>
            <div className="font-medium">
              {project.businessLine === "impulse" ? "Импульс" : "Агентство"}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Тип клиента</div>
            <div className="font-medium">{project.clientType ? (clientTypeLabels[project.clientType] || project.clientType) : '—'}</div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Статус</div>
            <div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                project.status === 'paid' 
                  ? 'bg-green-100 text-green-800'
                  : project.status === 'prepaid'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {statusLabels[project.status]}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Контакт заказчика</div>
            <div className="font-medium">{project.clientContact || '—'}</div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Способ оплаты</div>
            <div className="font-medium">
              {project.paymentMethod ? paymentMethodLabels[project.paymentMethod] || project.paymentMethod : '—'}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Прибыль</div>
            <div className={`font-bold text-lg ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
        {project.notes && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-[var(--muted-foreground)] mb-1">Заметки</div>
            <div className="text-sm">{project.notes}</div>
          </div>
        )}
      </div>

      <div className="bg-[var(--surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border)] p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Расходы</h2>
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:brightness-110"
          >
            + Добавить расход
          </button>
        </div>

        {showExpenseForm && (
          <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-[var(--surface-2)] rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Имя сотрудника *</label>
                <input
                  name="employeeName"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Роль *</label>
                <select
                  name="employeeRole"
                  required
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                >
                  <option value="designer">Дизайнер</option>
                  <option value="pm">Проджект</option>
                  <option value="copywriter">Копирайтер</option>
                  <option value="assistant">Ассистент</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Сумма *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Заметки</label>
                <input
                  name="notes"
                  type="text"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-md text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium hover:brightness-110"
              >
                Добавить
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--surface-2)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase">Сотрудник</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase">Роль</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase">Заметки</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  roleLabels={roleLabels}
                  onUpdate={handleUpdateExpense}
                  onDelete={handleDeleteExpense}
                />
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-[var(--muted-foreground)]">
                    Нет расходов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
