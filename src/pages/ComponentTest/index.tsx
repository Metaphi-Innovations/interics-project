import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import StarIcon from '@mui/icons-material/Star'
import FavoriteIcon from '@mui/icons-material/Favorite'
import HomeIcon from '@mui/icons-material/Home'

import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  MultiSelect,
  Checkbox,
  RadioGroup,
  Toggle,
  DatePicker,
  DateRangePicker,
  FileUpload,
  Tooltip,
  Divider as DsDivider,
} from '../../design-system/components/primitives'

import {
  Badge,
  Avatar,
  AvatarGroup,
  Spinner,
  Tag,
  CopyButton,
  UserCard,
  NotificationBell,
  ActivityFeed,
} from '../../design-system/components/display'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Box>
  )
}

const colorOptions = [
  { label: 'Red', value: 'red' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Purple', value: 'purple' },
]

const radioOptions = [
  { label: 'Option A', value: 'a', description: 'First choice' },
  { label: 'Option B', value: 'b', description: 'Second choice' },
  { label: 'Option C', value: 'c' },
]

const mockUsers = [
  { name: 'Alice Smith', src: undefined },
  { name: 'Bob Jones' },
  { name: 'Carol White' },
  { name: 'Dave Brown' },
  { name: 'Eve Davis' },
  { name: 'Frank Miller' },
]

const mockActivities = [
  {
    id: '1',
    user: { name: 'Alice Smith' },
    action: 'created',
    target: 'Invoice #1234',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    metadata: { Amount: '$1,200', Status: 'Pending' },
  },
  {
    id: '2',
    user: { name: 'Bob Jones' },
    action: 'updated',
    target: 'Project Alpha',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: '3',
    icon: <HomeIcon sx={{ fontSize: 18 }} />,
    action: 'New deployment to production',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    color: '#10B981',
  },
  {
    id: '4',
    user: { name: 'Carol White' },
    action: 'commented on',
    target: 'Design Review',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '5',
    user: { name: 'Dave Brown' },
    action: 'deleted',
    target: 'Old Records',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
]

export default function ComponentTest() {
  const [inputVal, setInputVal] = useState('')
  const [textareaVal, setTextareaVal] = useState('')
  const [selectVal, setSelectVal] = useState<string | number>('')
  const [multiVal, setMultiVal] = useState<(string | number)[]>(['red', 'blue'])
  const [checked, setChecked] = useState(false)
  const [radioVal, setRadioVal] = useState<string | number>('a')
  const [toggleOn, setToggleOn] = useState(true)
  const [date, setDate] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={4}>
        Component Test
      </Typography>

      {/* ── BUTTONS ── */}
      <Section title="Button">
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          <Button label="Contained" variant="contained" />
          <Button label="Outlined" variant="outlined" />
          <Button label="Text" variant="text" />
          <Button label="Soft" variant="soft" />
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          {(['primary', 'secondary', 'error', 'success', 'warning', 'info'] as const).map((c) => (
            <Button key={c} label={c} color={c} variant="soft" />
          ))}
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Button label="Small" size="sm" />
          <Button label="Medium" size="md" />
          <Button label="Large" size="lg" />
          <Button label="Loading" loading />
          <Button label="Disabled" disabled />
          <Button label="With icon" startIcon={<StarIcon sx={{ fontSize: 16 }} />} />
        </Stack>
      </Section>

      {/* ── ICON BUTTONS ── */}
      <Section title="IconButton">
        <Stack direction="row" gap={1} flexWrap="wrap">
          <IconButton icon={<StarIcon />} tooltip="Default" />
          <IconButton icon={<StarIcon />} tooltip="Contained" variant="contained" color="primary" />
          <IconButton icon={<StarIcon />} tooltip="Outlined" variant="outlined" color="primary" />
          <IconButton icon={<StarIcon />} tooltip="Soft" variant="soft" color="primary" />
          <IconButton icon={<FavoriteIcon />} tooltip="Error soft" variant="soft" color="error" />
          <IconButton icon={<StarIcon />} size="sm" tooltip="Small" />
          <IconButton icon={<StarIcon />} size="md" tooltip="Medium" />
          <IconButton icon={<StarIcon />} size="lg" tooltip="Large" />
          <IconButton icon={<StarIcon />} loading tooltip="Loading" />
        </Stack>
      </Section>

      {/* ── INPUT ── */}
      <Section title="Input">
        <Stack spacing={2} sx={{ maxWidth: 400 }}>
          <Input label="Default" placeholder="Enter text..." value={inputVal} onChange={setInputVal} fullWidth />
          <Input label="With count" value={inputVal} onChange={setInputVal} maxLength={50} showCount fullWidth />
          <Input label="Error state" error helperText="This field is required" fullWidth />
          <Input
            label="With adornments"
            startAdornment={<StarIcon sx={{ fontSize: 18 }} />}
            endAdornment={<Typography variant="caption">USD</Typography>}
            fullWidth
          />
          <Input label="Small" size="sm" fullWidth />
          <Input label="Disabled" disabled value="Can't edit this" fullWidth />
        </Stack>
      </Section>

      {/* ── TEXTAREA ── */}
      <Section title="Textarea">
        <Stack spacing={2} sx={{ maxWidth: 400 }}>
          <Textarea label="Default" placeholder="Enter text..." value={textareaVal} onChange={setTextareaVal} fullWidth />
          <Textarea label="With count" value={textareaVal} onChange={setTextareaVal} maxLength={200} showCount fullWidth />
          <Textarea label="Auto resize" autoResize minRows={2} maxRows={6} fullWidth />
          <Textarea label="Error" error helperText="Required" fullWidth />
        </Stack>
      </Section>

      {/* ── SELECT ── */}
      <Section title="Select">
        <Stack spacing={2} sx={{ maxWidth: 300 }}>
          <Select label="Color" options={colorOptions} value={selectVal} onChange={setSelectVal} fullWidth placeholder="Pick a color" />
          <Select label="Clearable" options={colorOptions} value={selectVal} onChange={setSelectVal} clearable fullWidth />
          <Select label="Error" options={colorOptions} error helperText="Required" fullWidth />
          <Select label="Loading" options={colorOptions} loading fullWidth />
        </Stack>
      </Section>

      {/* ── MULTISELECT ── */}
      <Section title="MultiSelect">
        <Stack spacing={2} sx={{ maxWidth: 400 }}>
          <MultiSelect
            label="Colors"
            options={colorOptions}
            value={multiVal}
            onChange={setMultiVal}
            fullWidth
            placeholder="Pick colors"
          />
          <MultiSelect
            label="Searchable"
            options={colorOptions}
            value={multiVal}
            onChange={setMultiVal}
            searchable
            fullWidth
          />
          <MultiSelect
            label="Max 2 chips"
            options={colorOptions}
            value={multiVal}
            onChange={setMultiVal}
            maxDisplay={2}
            fullWidth
          />
        </Stack>
      </Section>

      {/* ── CHECKBOX ── */}
      <Section title="Checkbox">
        <Stack spacing={1}>
          <Checkbox label="Unchecked" checked={false} onChange={() => {}} />
          <Checkbox label="Checked" checked={checked} onChange={setChecked} />
          <Checkbox label="Indeterminate" indeterminate />
          <Checkbox label="Disabled checked" checked disabled />
          <Checkbox label="Error with helper" error helperText="Please accept the terms" />
          <Stack direction="row" gap={2}>
            <Checkbox label="Small" size="sm" />
            <Checkbox label="Medium" size="md" />
            <Checkbox label="Large" size="lg" />
          </Stack>
        </Stack>
      </Section>

      {/* ── RADIO GROUP ── */}
      <Section title="RadioGroup">
        <Stack spacing={2}>
          <RadioGroup label="Vertical" options={radioOptions} value={radioVal} onChange={setRadioVal} />
          <RadioGroup label="Horizontal" options={radioOptions} value={radioVal} onChange={setRadioVal} orientation="horizontal" />
        </Stack>
      </Section>

      {/* ── TOGGLE ── */}
      <Section title="Toggle">
        <Stack spacing={1}>
          <Toggle label="Toggle on" checked={toggleOn} onChange={setToggleOn} />
          <Toggle label="Toggle off" checked={!toggleOn} onChange={() => {}} />
          <Toggle label="With description" description="Enable notifications for this project" checked={toggleOn} onChange={setToggleOn} />
          <Toggle label="Disabled" disabled checked />
          <Stack direction="row" gap={2} alignItems="center">
            <Toggle label="sm" size="sm" />
            <Toggle label="md" size="md" />
            <Toggle label="lg" size="lg" />
          </Stack>
        </Stack>
      </Section>

      {/* ── DATE PICKER ── */}
      <Section title="DatePicker">
        <Stack spacing={2} sx={{ maxWidth: 280 }}>
          <DatePicker label="Date" value={date} onChange={setDate} fullWidth />
          <DatePicker label="Disable past" disablePast fullWidth />
          <DatePicker label="Error" error helperText="Invalid date" fullWidth />
        </Stack>
      </Section>

      {/* ── DATE RANGE PICKER ── */}
      <Section title="DateRangePicker">
        <DateRangePicker
          label="Date range"
          value={dateRange}
          onChange={setDateRange}
        />
      </Section>

      {/* ── FILE UPLOAD ── */}
      <Section title="FileUpload">
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <FileUpload
            label="Images only"
            accept="image/*"
            multiple
            preview
            onUpload={(files) => console.log('uploaded', files)}
            onError={(err) => console.error(err)}
          />
          <FileUpload
            label="Error state"
            error
            helperText="Upload failed"
            onUpload={() => {}}
          />
        </Stack>
      </Section>

      {/* ── TOOLTIP ── */}
      <Section title="Tooltip">
        <Stack direction="row" gap={2} flexWrap="wrap">
          <Tooltip content="Top tooltip" placement="top">
            <Button label="Top" variant="outlined" />
          </Tooltip>
          <Tooltip content="Bottom tooltip" placement="bottom">
            <Button label="Bottom" variant="outlined" />
          </Tooltip>
          <Tooltip content="Rich content tooltip with longer text" maxWidth={160}>
            <Button label="Rich" variant="outlined" />
          </Tooltip>
        </Stack>
      </Section>

      {/* ── DIVIDER ── */}
      <Section title="Divider">
        <Stack spacing={2}>
          <DsDivider />
          <DsDivider label="OR" />
          <DsDivider label="Section" labelPosition="left" />
          <DsDivider variant="middle" />
        </Stack>
      </Section>

      {/* ── BADGE ── */}
      <Section title="Badge">
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          {(['primary', 'secondary', 'error', 'success', 'warning', 'info', 'neutral'] as const).map((c) => (
            <Badge key={c} label={c} color={c} />
          ))}
        </Stack>
        <Stack direction="row" gap={1} mb={2}>
          <Badge label="Filled" variant="filled" />
          <Badge label="Outlined" variant="outlined" />
          <Badge label="Soft" variant="soft" />
        </Stack>
        <Stack direction="row" gap={1} mb={2}>
          <Badge label="sm" size="sm" />
          <Badge label="md" size="md" />
          <Badge label="lg" size="lg" />
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <Badge label="With icon" icon={<StarIcon sx={{ fontSize: 12 }} />} />
          <Badge label="Deletable" onDelete={() => {}} />
          <Badge label="dot" dot />
        </Stack>
      </Section>

      {/* ── AVATAR ── */}
      <Section title="Avatar">
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
            <Avatar key={s} name="Sarah Johnson" size={s} />
          ))}
        </Stack>
        <Stack direction="row" gap={2} alignItems="center" mb={2}>
          <Avatar name="Alice B" online />
          <Avatar name="Bob C" shape="square" />
          <Avatar name="Carol D" shape="rounded" color="#107E68" />
          <Avatar name="Dave E" src="https://i.pravatar.cc/64?u=1" />
        </Stack>
      </Section>

      {/* ── AVATAR GROUP ── */}
      <Section title="AvatarGroup">
        <Stack spacing={2}>
          <AvatarGroup users={mockUsers} max={4} size="md" />
          <AvatarGroup users={mockUsers} max={3} size="lg" />
        </Stack>
      </Section>

      {/* ── SPINNER ── */}
      <Section title="Spinner">
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
            <Spinner key={s} size={s} />
          ))}
          <Spinner size="md" color="error" />
          <Spinner size="md" color="success" />
          <Box sx={{ position: 'relative', width: 80, height: 80, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Spinner overlay />
          </Box>
        </Stack>
      </Section>

      {/* ── TAG ── */}
      <Section title="Tag">
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Tag label="Design" color="#6366F1" />
          <Tag label="Bug" color="#EF4444" />
          <Tag label="Feature" color="#10B981" />
          <Tag label="Deletable" color="#F59E0B" onDelete={() => {}} />
          <Tag label="Clickable" color="#3B82F6" onClick={() => {}} />
          <Tag label="Small" color="#7C3AED" size="sm" />
        </Stack>
      </Section>

      {/* ── COPY BUTTON ── */}
      <Section title="CopyButton">
        <Stack direction="row" gap={2} alignItems="center">
          <CopyButton value="Hello World" tooltip="Copy text" />
          <CopyButton value="Hello World" iconOnly={false} label="Copy code" />
          <CopyButton value="Hello World" size="md" />
          <Typography variant="body2" color="text.secondary">Click any button to copy "Hello World"</Typography>
        </Stack>
      </Section>

      {/* ── USER CARD ── */}
      <Section title="UserCard">
        <Stack spacing={2}>
          <UserCard name="Sarah Johnson" email="sarah@example.com" role="Admin" online />
          <UserCard name="Bob Jones" role="Developer" size="sm" />
          <UserCard name="Carol White" email="carol@example.com" role="Designer" size="lg" orientation="vertical" />
        </Stack>
      </Section>

      {/* ── NOTIFICATION BELL ── */}
      <Section title="NotificationBell">
        <Stack direction="row" gap={3} alignItems="center">
          <NotificationBell count={0} />
          <NotificationBell count={5} />
          <NotificationBell count={150} max={99} />
        </Stack>
      </Section>

      {/* ── ACTIVITY FEED ── */}
      <Section title="ActivityFeed">
        <Stack spacing={3}>
          <ActivityFeed items={mockActivities} />
          <DsDivider label="Loading state" />
          <ActivityFeed items={[]} loading />
          <DsDivider label="Empty state" />
          <ActivityFeed items={[]} emptyText="No activity to show" />
        </Stack>
      </Section>
    </Box>
  )
}
