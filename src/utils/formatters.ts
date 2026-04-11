export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return (amount / 10000000).toFixed(1) + ' Cr'
  if (amount >= 100000) return (amount / 100000).toFixed(1) + ' L'
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K'
  return amount.toString()
}

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export const getAvatarColor = (name: string): { bg: string; text: string } => {
  const palettes = [
    { bg: '#D4EDE7', text: '#0A5144' }, // teal
    { bg: '#E4DDF5', text: '#4A3AAF' }, // purple
    { bg: '#FAE0D0', text: '#B83A0A' }, // orange
    { bg: '#D0E4F5', text: '#1A4F8A' }, // blue
    { bg: '#D0F0DC', text: '#145E2E' }, // green
    { bg: '#F5D0D0', text: '#8A1414' }, // red
    { bg: '#EDD0F5', text: '#7A1490' }, // violet
    { bg: '#F5EDD0', text: '#8A6A14' }, // amber
    { bg: '#D0EEF5', text: '#145E6E' }, // cyan
    { bg: '#F5D0EE', text: '#8A1470' }, // pink
  ]
  return palettes[name.charCodeAt(0) % palettes.length]
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
