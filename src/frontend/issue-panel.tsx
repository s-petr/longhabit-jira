import { invoke, view } from '@forge/bridge'
import ForgeReconciler, {
  Box,
  Button,
  Calendar,
  Inline,
  Label,
  ProgressBar,
  Stack,
  Text,
  Textfield,
  Toggle
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task, TaskMetadata } from '../schemas/task'
import { dateToString } from '../utils/date-convert'
import Autocomplete from './components/autocomplete'

function ToggleActive({ isActive }: { isActive: boolean }) {
  const handleAddTask = async () => {
    await invoke('addTask')
    await view.refresh()
  }

  const handleHideTask = async () => {
    await invoke('hideTask')
    await view.refresh()
  }

  return (
    <Box xcss={{ paddingTop: 'space.200' }}>
      <Inline space='space.100' alignBlock='center'>
        <Toggle
          id='active'
          size='large'
          isChecked={isActive}
          onChange={() => (isActive ? handleHideTask() : handleAddTask())}
        />
        <Label labelFor='active'>Track with LongHabit</Label>
      </Inline>
    </Box>
  )
}

function IssuePanel() {
  const [taskData, setTaskData] = useState<TaskMetadata | null>(null)
  const [taskDataHasChanged, setTaskDataHasChanged] = useState(false)
  const [categoriesList, setCategoriesList] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTaskData = async () => {
    try {
      setIsLoading(true)
      const taskData: Task | null = await invoke('getTask')
      const categoriesData: string[] = await invoke('getCategoriesList')
      setTaskData(taskData)
      setCategoriesList(categoriesData)
    } catch (error) {
      console.error('Error loading task data')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTaskData()
  }, [])

  const handleUpdateTask = async () => {
    if (!taskData) return
    await invoke('setTask', taskData)
    await view.refresh()
  }

  const handleSetTaskData = (key: keyof TaskMetadata, value: any) => {
    if (!taskData || taskData[key] === value) return
    setTaskDataHasChanged(true)
    setTaskData((current) => ({
      ...current!,
      [key]: value
    }))
  }

  const handleSetHistory = (e: any) => {
    const selectedDay = e?.iso
    const currentHistory = taskData?.history ?? []
    const newHistory = currentHistory.includes(selectedDay)
      ? currentHistory.filter((day) => day !== selectedDay)
      : [...currentHistory, selectedDay].sort()

    handleSetTaskData('history', newHistory)
  }

  return isLoading ? (
    <Box xcss={{ paddingTop: 'space.400' }}>
      <ProgressBar isIndeterminate ariaLabel='Loading task metadata' />
    </Box>
  ) : taskData?.isActive ? (
    <Inline
      shouldWrap
      space='space.400'
      alignInline='start'
      spread='space-between'>
      <Stack space='space.200'>
        <ToggleActive isActive={!!taskData?.isActive} />
        <Inline space='space.100' alignBlock='center' grow='hug'>
          <Toggle
            id='repeat-enabled'
            size='large'
            isChecked={!!taskData.repeatGoalEnabled}
            onChange={(e) =>
              handleSetTaskData('repeatGoalEnabled', !!e.target.checked)
            }
          />

          <Label labelFor='repeat-enabled'>Repeat every</Label>
          <Textfield
            isCompact
            id='days-repeat'
            width={65}
            type='Number'
            value={taskData.daysRepeat}
            isDisabled={!taskData.repeatGoalEnabled}
            onChange={(e) =>
              handleSetTaskData('daysRepeat', Number(e.target.value))
            }
          />
          <Label labelFor='days-repeat'>days</Label>
        </Inline>
        <Stack space='space.050'>
          <Label labelFor='category'>Category</Label>
          <Box xcss={{ width: '100%' }}>
            <Autocomplete
              id='category'
              options={categoriesList}
              value={taskData.category ?? ''}
              onChange={(value) => handleSetTaskData('category', value)}
            />
          </Box>
        </Stack>
        {taskDataHasChanged && (
          <Box xcss={{ width: '150px' }}>
            <Button
              shouldFitContainer
              appearance='primary'
              onClick={handleUpdateTask}>
              Update
            </Button>
          </Box>
        )}
      </Stack>
      <Stack space='space.050' alignInline='center'>
        <Text size='small' weight='medium'>
          Task Completion History
        </Text>
        <Calendar
          maxDate={dateToString(new Date())}
          selected={taskData.history ?? []}
          onSelect={handleSetHistory}
        />
      </Stack>
    </Inline>
  ) : (
    <ToggleActive isActive={!!taskData?.isActive} />
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <IssuePanel />
  </React.StrictMode>
)
