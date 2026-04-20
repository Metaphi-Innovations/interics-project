export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return (amount / 10000000).toFixed(1) + ' Cr'
  if (amount >= 100000) return (amount / 100000).toFixed(1) + ' L'
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K'
  return amount.toString()
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Full Indian-grouped amount (e.g. listing invoice lines and totals). */
export const formatInr = (amount: number): string => inrFormatter.format(amount)

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export const getAvatarColor = (name: string): { bg: string; text: string } => {
  const colors = [
    { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
    { bg: '#EDE9FE', text: '#7C3AED' }, // purple
    { bg: '#DCFCE7', text: '#15803D' }, // green
    { bg: '#FEF3C7', text: '#B45309' }, // amber
    { bg: '#CCFBF1', text: '#0F766E' }, // teal
    { bg: '#FEE2E2', text: '#B91C1C' }, // red
    { bg: '#FCE7F3', text: '#BE185D' }, // pink
    { bg: '#FFEDD5', text: '#C2410C' }, // orange
  ]
  const index =
    name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

export const fromSlug = (
  slug: string,
  items: { id: string; name: string }[],
): string | undefined =>
  items.find((item) => toSlug(item.name) === slug)?.id

export const formatDate = (date: string | null): string => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return minutes + ' min ago'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago'
  const days = Math.floor(hours / 24)
  return days + ' day' + (days > 1 ? 's' : '') + ' ago'
}
