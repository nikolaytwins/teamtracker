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
  parseAgencyDetailClock,
} from '@/lib/agency/detail-line-total'
import { formatFinanceMonthLabel, projectMonthKey } from '@/lib/agency/client-share'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import './agency-project-detail-design.css'

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
  clientShareToken?: string | null
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
  timerPreviousSeconds?: number
}

interface TrackedTimeRow {
  id: string
  task: string
  activity: string
  durationSeconds: number
  trackedAt: string
  inEstimate: boolean
  detailId: string | null
}

function money(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`
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
      <td>
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
            className="cell-inp"
          />
        ) : (
          <button type="button" onClick={() => handleStartEdit('employeeName', expense.employeeName)} className="cell-inp" style={{ textAlign: 'left' }}>
            {expense.employeeName}
          </button>
        )}
      </td>
      <td>
        {editingField === 'employeeRole' ? (
          <select
            value={tempValue}
            onChange={(e) => {
              setTempValue(e.target.value)
              handleSave('employeeRole')
            }}
            onBlur={() => setEditingField(null)}
            autoFocus
            className="inp"
          >
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <button type="button" onClick={() => handleStartEdit('employeeRole', expense.employeeRole)} className="cell-inp" style={{ textAlign: 'left' }}>
            {roleLabels[expense.employeeRole] || expense.employeeRole}
          </button>
        )}
      </td>
      <td className="right">
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
            className="cell-inp cell-inp--n"
          />
        ) : (
          <button type="button" onClick={() => handleStartEdit('amount', expense.amount)} className="cell-inp cell-inp--n">
            {expense.amount.toLocaleString('ru-RU')} ₽
          </button>
        )}
      </td>
      <td>
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
            className="cell-inp"
          />
        ) : (
          <button type="button" onClick={() => handleStartEdit('notes', expense.notes || '')} className="cell-inp" style={{ textAlign: 'left', width: '100%' }}>
            {expense.notes || '—'}
          </button>
        )}
      </td>
      <td className="right">
        <button type="button" onClick={() => onDelete(expense.id)} className="del">
          Удалить
        </button>
      </td>
    </tr>
  )
}

function HourlyClockCell({
  liveSeconds,
  running,
  sessionSeconds,
  fixedSeconds,
  previousSeconds,
  onCommit,
  onRestore,
}: {
  liveSeconds: number
  running: boolean
  sessionSeconds: number
  fixedSeconds: number
  previousSeconds: number
  onCommit: (seconds: number) => void
  onRestore: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(formatAgencyDetailClock(liveSeconds))
    setEditing(true)
  }

  const commit = () => {
    const parsed = parseAgencyDetailClock(draft)
    setEditing(false)
    if (parsed == null) return
    if (parsed === liveSeconds && !running) return
    onCommit(parsed)
  }

  const showPrev = previousSeconds > 0 && previousSeconds !== liveSeconds

  return (
    <div className="right">
      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setEditing(false)
            }
          }}
          aria-label="Время таймера"
          className="clock-inp"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          title="Изменить время"
          className={`clock${running ? ' run' : ''}`}
        >
          {formatAgencyDetailClock(liveSeconds)}
        </button>
      )}
      {running ? (
        <div className="sub" style={{ color: 'var(--green)' }}>
          Идёт · сессия {formatAgencyDetailClock(sessionSeconds)}
        </div>
      ) : (
        <div className="sub">
          {fixedSeconds > 0
            ? `На паузе · ${formatAgencyDetailHours(fixedSeconds)}`
            : 'Ещё не запускали'}
        </div>
      )}
      {showPrev ? (
        <button
          type="button"
          onClick={onRestore}
          title="Вернуть время до последнего старта"
          className="del"
          style={{ padding: '4px 0' }}
        >
          было {formatAgencyDetailClock(previousSeconds)}
        </button>
      ) : null}
    </div>
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
  const [addBillingType, setAddBillingType] = useState<'fixed' | 'hourly'>('hourly')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [hourlyRateDraft, setHourlyRateDraft] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [trackedTime, setTrackedTime] = useState<TrackedTimeRow[]>([])
  const [togglingEstimateId, setTogglingEstimateId] = useState<string | null>(null)
  const [estimateToggleError, setEstimateToggleError] = useState<string | null>(null)
  const [sharePath, setSharePath] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const trackedPromise =
        variant === 'v2'
          ? fetch(apiUrl(`${apiBase}/projects/${id}/tracked-time`)).then((r) => (r.ok ? r.json() : []))
          : Promise.resolve([])
      const [projectRes, expensesRes, detailsRes, trackedRes] = await Promise.all([
        fetch(apiUrl(`${apiBase}/projects`)).then(r => r.json()),
        fetch(apiUrl(`${apiBase}/expenses?projectId=${id}`)).then(r => r.json()),
        fetch(apiUrl(`${apiBase}/project-details?projectId=${id}`)).then(r => r.json()),
        trackedPromise,
      ])
      
      const proj = projectRes.find((p: Project) => p.id === id)
      setProject(proj || null)
      if (proj) setHourlyRateDraft(String(Number(proj.hourlyRateRub) || 0))
      setExpenses(expensesRes)
      setDetails(Array.isArray(detailsRes) ? detailsRes : [])
      setTrackedTime(Array.isArray(trackedRes) ? trackedRes : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [id, apiBase, variant])

  useEffect(() => {
    if (id) {
      void fetchData()
    }
  }, [id, fetchData])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetch(apiUrl(`${apiBase}/projects/${id}/client-share`))
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.path) return
        setSharePath(String(json.path))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [id, apiBase])

  useEffect(() => {
    const hasRunning = details.some((d) => d.billingType === 'hourly' && d.timerStartedAt)
    if (!hasRunning) return
    const t = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [details])

  const handleToggleTrackedInEstimate = async (row: TrackedTimeRow, next: boolean) => {
    if (variant !== 'v2') return
    setEstimateToggleError(null)
    setTogglingEstimateId(row.id)
    try {
      const res = await fetch(apiUrl(`/api/v2/agency/tracked-time/${row.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inEstimate: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEstimateToggleError(String(json.error || 'Не удалось обновить смету'))
        return
      }
      await fetchData()
    } catch (e) {
      console.error(e)
      setEstimateToggleError('Не удалось обновить смету')
    } finally {
      setTogglingEstimateId(null)
    }
  }

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
        setAddBillingType('hourly')
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

  const handleSetDetailSeconds = async (detailId: string, seconds: number) => {
    const current = details.find((d) => d.id === detailId)
    if (!current) return
    const next: ProjectDetail = {
      ...current,
      trackedSeconds: Math.max(0, Math.floor(seconds)),
      timerStartedAt: null,
    }
    setDetails((prev) => prev.map((d) => (d.id === detailId ? next : d)))
    setNowMs(Date.now())
    try {
      const res = await fetch(apiUrl(`${apiBase}/project-details/${detailId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) {
        console.error('Failed to set timer seconds')
        fetchData()
        return
      }
      const json = await res.json().catch(() => null)
      if (json?.detail) {
        setDetails((prev) => prev.map((d) => (d.id === detailId ? { ...d, ...json.detail } : d)))
      }
    } catch (error) {
      console.error('Error setting timer seconds:', error)
      fetchData()
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
        showToast('Ставка сохранена')
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
        fetchData()
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      fetchData()
    }
  }

  const shareUrl = useMemo(() => {
    if (!sharePath) return ''
    if (typeof window === 'undefined') return sharePath
    return `${window.location.origin}${appPath(sharePath)}`
  }, [sharePath])

  const copyShareLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Ссылка скопирована')
    } catch {
      showToast('Не удалось скопировать')
    }
  }

  const exportEstimate = () => {
    if (!project) return
    const hourlyRate = Number(project.hourlyRateRub) || 0
    const rows = [
      ['Задача', 'Тип', 'Кол-во / часы', 'Стоимость', 'Итого'],
      ...details.map((d) => {
        const isHourly = d.billingType === 'hourly'
        const liveSeconds = isHourly
          ? agencyDetailEffectiveSeconds(
              { trackedSeconds: d.trackedSeconds, timerStartedAt: d.timerStartedAt },
              nowMs
            )
          : 0
        const lineTotal = agencyDetailLineTotal(
          {
            billingType: d.billingType,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            trackedSeconds: liveSeconds,
          },
          hourlyRate
        )
        return [
          d.title,
          isHourly ? 'По времени' : 'Фикс',
          isHourly ? formatAgencyDetailHours(liveSeconds) : String(d.quantity),
          isHourly ? String(hourlyRate) : String(d.unitPrice),
          String(Math.round(lineTotal)),
        ]
      }),
    ]
    const csv = `\uFEFF${rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[\\/:*?"<>|]+/g, '_')}-smeta.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Смета экспортирована')
  }

  if (loading) {
    return (
      <div className="agency-proj-v3">
        <div className="page">
          <div className="empty">Загрузка...</div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="agency-proj-v3">
        <div className="page">
          <Link href={appPath(paths.listHref)} className="back">
            ← Назад к проектам
          </Link>
          <section className="card pad">Проект не найден</section>
        </div>
      </div>
    )
  }

  const hourlyRate = Number(project.hourlyRateRub) || 0
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const lineMeta = details.map((d) => {
    const isHourly = d.billingType === 'hourly'
    const liveSeconds = isHourly
      ? agencyDetailEffectiveSeconds(
          { trackedSeconds: d.trackedSeconds, timerStartedAt: d.timerStartedAt },
          nowMs
        )
      : 0
    const lineTotal = agencyDetailLineTotal(
      {
        billingType: d.billingType,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        trackedSeconds: liveSeconds,
      },
      hourlyRate
    )
    return { d, isHourly, liveSeconds, lineTotal }
  })
  const totalDetailsAmount = lineMeta.reduce((sum, row) => sum + row.lineTotal, 0)
  const hourlySeconds = lineMeta.reduce((sum, row) => sum + (row.isHourly ? row.liveSeconds : 0), 0)
  const fixedTotal = lineMeta.reduce((sum, row) => sum + (row.isHourly ? 0 : row.lineTotal), 0)
  const effectiveTotalAmount = details.length > 0 ? totalDetailsAmount : project.totalAmount
  const profit = effectiveTotalAmount - totalExpenses
  const due = Math.max(0, effectiveTotalAmount - (Number(project.paidAmount) || 0))
  const monthMeta = formatFinanceMonthLabel(projectMonthKey(project.createdAt))

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
    permanent: 'Постоянный',
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

  const lineLabel =
    project.businessLine === 'impulse' ? 'impulse' : project.businessLine === 'qmagic' ? 'qmagic' : 'agency'
  const unpaid = project.status !== 'paid'

  return (
    <div className="agency-proj-v3">
      <div className="page">
        <Link href={appPath(paths.listHref)} className="back">
          ← Назад к проектам
        </Link>

        <section className="card head">
          <div>
            <span className="kick">Проект агентства</span>
            <h1 className="big-title">{project.name}</h1>
            <div className="chips">
              <span className="chip">Ставка <b>{hourlyRate.toLocaleString('ru-RU')} ₽/ч</b></span>
              <span className="chip">Работа <b>{project.clientType ? (clientTypeLabels[project.clientType] || project.clientType) : '—'}</b></span>
              <span className="chip">Тип <b>{serviceLabels[project.serviceType] || project.serviceType}</b></span>
              <span className={`chip ${unpaid ? 'chip--warn' : 'chip--ok'}`}>
                Оплата <b>{statusLabels[project.status] || project.status}</b>
              </span>
            </div>
          </div>
          <div className="head-a">
            {shareUrl ? (
              <a className="btn btn--pri" href={shareUrl} target="_blank" rel="noreferrer">
                <svg className="svgi" viewBox="0 0 24 24">
                  <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                  <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                </svg>
                Ссылка для клиента
              </a>
            ) : (
              <button type="button" className="btn btn--pri" disabled>
                Ссылка для клиента
              </button>
            )}
            <button type="button" className="btn btn--line" onClick={exportEstimate}>
              Экспорт сметы
            </button>
          </div>
        </section>

        <section className="card pad">
          <div className="kpis">
            <div className="kpi">
              <div className="kpi-l">Время в работе</div>
              <div className="kpi-v">{hourlySeconds > 0 ? formatAgencyDetailHours(hourlySeconds) : '—'}</div>
              <div className="kpi-s">по {hourlyRate.toLocaleString('ru-RU')} ₽/ч</div>
            </div>
            <div className="kpi">
              <div className="kpi-l">Работы по факту</div>
              <div className="kpi-v">{fixedTotal > 0 ? money(fixedTotal) : '—'}</div>
              <div className="kpi-s">фикс-задачи</div>
            </div>
            <div className="kpi kpi--acc">
              <div className="kpi-l">Итого по смете</div>
              <div className="kpi-v">{money(effectiveTotalAmount)}</div>
              <div className="kpi-s">{monthMeta.label.toLowerCase()}</div>
            </div>
            <div className="kpi">
              <div className="kpi-l">Оплачено</div>
              <div className="kpi-v">{money(project.paidAmount)}</div>
              <div className="kpi-s">к оплате {money(due)}</div>
            </div>
          </div>
        </section>

        <section className="card pad">
          <div className="headrow">
            <h2 className="sec-title">Задачи месяца</h2>
            <span className="sec-sub">{monthMeta.label}</span>
          </div>
          <form className="addbar" onSubmit={handleAddDetail}>
            <div className="seg">
              <button
                type="button"
                className={addBillingType === 'hourly' ? 'on' : undefined}
                onClick={() => setAddBillingType('hourly')}
              >
                По времени
              </button>
              <button
                type="button"
                className={addBillingType === 'fixed' ? 'on' : undefined}
                onClick={() => setAddBillingType('fixed')}
              >
                Фикс
              </button>
            </div>
            <input className="inp inp--grow" name="title" placeholder="Название задачи" />
            <input
              className="inp inp--n"
              name="quantity"
              placeholder="Кол-во"
              type="number"
              min={1}
              defaultValue={1}
              style={{ display: addBillingType === 'fixed' ? undefined : 'none' }}
            />
            <input
              className="inp inp--n"
              name="unitPrice"
              placeholder="Цена, ₽"
              type="number"
              min={0}
              style={{ display: addBillingType === 'fixed' ? undefined : 'none' }}
            />
            <button type="submit" className="btn btn--dark btn--sm" style={{ height: 42, padding: '0 18px' }}>
              Добавить
            </button>
          </form>

          <table>
            <thead>
              <tr>
                <th>Задача</th>
                <th className="right">Кол-во / часы</th>
                <th className="right">Стоимость</th>
                <th className="right">Итого</th>
                <th className="right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {lineMeta.map(({ d, isHourly, liveSeconds, lineTotal }) => {
                const sessionSeconds = isHourly
                  ? agencyDetailSessionElapsedSeconds(d.timerStartedAt, nowMs)
                  : 0
                const fixedSeconds = Math.max(0, Number(d.trackedSeconds) || 0)
                const previousSeconds = Math.max(0, Number(d.timerPreviousSeconds) || 0)
                const running = Boolean(d.timerStartedAt)
                return (
                  <tr key={d.id}>
                    <td>
                      <input
                        type="text"
                        defaultValue={d.title}
                        onBlur={(e) => handleUpdateDetail(d.id, 'title')(e.target.value)}
                        className="cell-inp t-name"
                      />
                      <div className="sub">{isHourly ? 'По времени' : 'Фикс'}</div>
                    </td>
                    <td className="right">
                      {isHourly ? (
                        <HourlyClockCell
                          liveSeconds={liveSeconds}
                          running={running}
                          sessionSeconds={sessionSeconds}
                          fixedSeconds={fixedSeconds}
                          previousSeconds={previousSeconds}
                          onCommit={(sec) => void handleSetDetailSeconds(d.id, sec)}
                          onRestore={() => void handleSetDetailSeconds(d.id, previousSeconds)}
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={d.quantity}
                          onBlur={(e) => handleUpdateDetail(d.id, 'quantity')(e.target.value)}
                          className="cell-inp cell-inp--n"
                        />
                      )}
                    </td>
                    <td className="right">
                      {isHourly ? (
                        <span className="dash" style={{ color: 'var(--ink-300)' }}>—</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={d.unitPrice}
                          onBlur={(e) => handleUpdateDetail(d.id, 'unitPrice')(e.target.value)}
                          className="cell-inp cell-inp--n"
                        />
                      )}
                    </td>
                    <td className="right">
                      <span className="sum">{money(lineTotal)}</span>
                    </td>
                    <td className="right">
                      <div className="acts">
                        {isHourly ? (
                          <button
                            type="button"
                            onClick={() => void handleDetailTimer(d.id, running ? 'stop' : 'start')}
                            className={`btn btn--sm ${running ? 'btn--line' : 'btn--go'}`}
                          >
                            {running ? 'Пауза' : fixedSeconds > 0 ? 'Продолжить' : 'Старт'}
                          </button>
                        ) : null}
                        <button type="button" onClick={() => handleDeleteDetail(d.id)} className="del">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {details.length > 0 ? (
                <tr className="totrow">
                  <td>ИТОГО</td>
                  <td />
                  <td />
                  <td className="right">{money(totalDetailsAmount)}</td>
                  <td />
                </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="empty">Детализация пока не добавлена</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="ratebar">
            <div>
              <div className="kick">Стоимость часа</div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRateDraft}
                onChange={(e) => setHourlyRateDraft(e.target.value)}
                className="inp inp--n"
                style={{ marginTop: 8, width: 140 }}
              />
            </div>
            <button type="button" disabled={savingRate} onClick={() => void handleSaveHourlyRate()} className="btn btn--line btn--sm">
              {savingRate ? 'Сохранение…' : 'Сохранить ставку'}
            </button>
            <span className="sec-sub">В клиентской смете ставка и часы не показываются</span>
          </div>
        </section>

        {variant === 'v2' ? (
          <section className="card pad">
            <div className="headrow">
              <h2 className="sec-title">Учёт времени</h2>
              <span className="sec-sub">Личный таймер · в смету только по галочке</span>
            </div>
            {hourlyRate <= 0 ? <p className="sub" style={{ marginTop: 10 }}>Сначала укажите стоимость часа выше</p> : null}
            {estimateToggleError ? <p className="sub" style={{ marginTop: 10, color: 'var(--red)' }}>{estimateToggleError}</p> : null}
            <table>
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>Задача</th>
                  <th>Тип</th>
                  <th className="right">Время</th>
                  <th className="right">В смету</th>
                </tr>
              </thead>
              <tbody>
                {trackedTime.map((row) => (
                  <tr key={row.id}>
                    <td className="sub">
                      {new Date(row.trackedAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="t-name">{row.task || '—'}</td>
                    <td className="sub">{row.activity || '—'}</td>
                    <td className="right tnum">{formatAgencyDetailHours(row.durationSeconds)}</td>
                    <td className="right">
                      <label className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={row.inEstimate}
                          disabled={togglingEstimateId === row.id || (hourlyRate <= 0 && !row.inEstimate)}
                          onChange={(e) => void handleToggleTrackedInEstimate(row, e.target.checked)}
                        />
                        {row.inEstimate ? 'в смете' : 'почасово'}
                      </label>
                    </td>
                  </tr>
                ))}
                {!trackedTime.length ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Записей пока нет. Запустите таймер на странице «Время / Экономика» с привязкой к этому проекту.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="card pad">
          <div className="headrow" style={{ marginBottom: 16 }}>
            <h2 className="sec-title">О проекте</h2>
            {project.deadline ? <span className="sec-sub">Дедлайн: {formatDate(new Date(project.deadline))}</span> : null}
          </div>
          <div className="facts">
            <div>
              <div className="fact-l">Направление</div>
              <div className="fact-v">
                {project.businessLine === 'impulse' ? 'Импульс' : project.businessLine === 'qmagic' ? 'Qmagic' : 'Агентство'}
              </div>
            </div>
            <div>
              <div className="fact-l">Способ оплаты</div>
              <div className="fact-v">{project.paymentMethod ? paymentMethodLabels[project.paymentMethod] || project.paymentMethod : '—'}</div>
            </div>
            <div>
              <div className="fact-l">Контакт заказчика</div>
              <div className="fact-v">{project.clientContact || '—'}</div>
            </div>
            <div>
              <div className="fact-l">Прибыль</div>
              <div className="fact-v" style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(profit)}</div>
            </div>
            <div>
              <div className="fact-l">Расходы</div>
              <div className="fact-v">{money(totalExpenses)}</div>
            </div>
            {project.source_lead_id ? (
              <div>
                <div className="fact-l">Лид</div>
                <div className="fact-v">
                  <Link href={`/sales/leads#lead-${project.source_lead_id}`}>открыть в воронке</Link>
                </div>
              </div>
            ) : null}
          </div>
          {project.notes ? (
            <p className="sec-sub" style={{ marginTop: 16 }}>{project.notes}</p>
          ) : null}
        </section>

        <section className="card pad">
          <div className="headrow">
            <h2 className="sec-title">Расходы</h2>
            <button type="button" onClick={() => setShowExpenseForm(!showExpenseForm)} className="btn btn--dark btn--sm">
              {showExpenseForm ? 'Отмена' : '+ Добавить расход'}
            </button>
          </div>
          {showExpenseForm ? (
            <form onSubmit={handleAddExpense} className="exp-form" style={{ marginTop: 16 }}>
              <input name="employeeName" type="text" required placeholder="Имя сотрудника" className="inp" />
              <select name="employeeRole" required className="inp">
                <option value="designer">Дизайнер</option>
                <option value="pm">Проджект</option>
                <option value="copywriter">Копирайтер</option>
                <option value="assistant">Ассистент</option>
              </select>
              <input name="amount" type="number" step="0.01" required placeholder="Сумма" className="inp" />
              <input name="notes" type="text" placeholder="Заметки" className="inp" />
              <button type="submit" className="btn btn--pri btn--sm">Добавить</button>
            </form>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Роль</th>
                <th className="right">Сумма</th>
                <th>Заметки</th>
                <th className="right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  roleLabels={roleLabels}
                  onUpdate={handleUpdateExpense}
                  onDelete={handleDeleteExpense}
                />
              ))}
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">Нет расходов</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="share" id="client-share">
          <div>
            <span className="kick">Клиентский доступ</span>
            <h3>Ссылка для клиента</h3>
            <p>Клиент видит услуги, суммы и историю по месяцам. Часы, ставка и внутренние заметки не показываются.</p>
            <div className="linkbox">{shareUrl || 'Создаём ссылку…'}</div>
          </div>
          <div className="share-a">
            <button type="button" className="btn btn--wh" disabled={!shareUrl} onClick={() => void copyShareLink()}>
              Скопировать ссылку
            </button>
            {shareUrl ? (
              <a className="btn btn--ghw" href={shareUrl} target="_blank" rel="noreferrer">
                Открыть как клиент
              </a>
            ) : null}
          </div>
        </section>

        <div className="foot">
          ID проекта {project.id} · линия {lineLabel} · ставка {hourlyRate.toLocaleString('ru-RU')} ₽/час
        </div>
      </div>
      <div className={`toast${toast ? ' on' : ''}`}>{toast}</div>
    </div>
  )
}
