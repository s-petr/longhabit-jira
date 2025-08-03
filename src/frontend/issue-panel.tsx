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
      setTaskDataHasChanged(false)
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

  const handleAddTask = async () => {
    await invoke('addTask')
    await view.refresh()
  }

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

  return isLoading || !taskData ? (
    <Box xcss={{ paddingTop: 'space.400' }}>
      <ProgressBar isIndeterminate ariaLabel='Loading task details' />
    </Box>
  ) : taskData?.isActive || taskDataHasChanged ? (
    <Stack space='space.200'>
      <Inline
        shouldWrap
        space='space.400'
        alignInline='start'
        spread='space-between'>
        <Stack space='space.200'>
          <Box xcss={{ paddingTop: 'space.200' }}>
            <Inline space='space.100' alignBlock='center'>
              <Toggle
                id='active'
                size='large'
                isChecked={!!taskData?.isActive}
                onChange={(e) =>
                  handleSetTaskData('isActive', !!e.target.checked)
                }
              />
              <Label labelFor='active'>Track with LongHabit</Label>
            </Inline>
          </Box>

          <Inline space='space.100' alignBlock='center' grow='hug'>
            <Toggle
              id='repeat-enabled'
              size='large'
              isChecked={!!taskData.repeatGoalEnabled}
              isDisabled={!taskData?.isActive}
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
              isDisabled={!taskData.repeatGoalEnabled || !taskData?.isActive}
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
                isDisabled={!taskData?.isActive}
                onChange={(value) => handleSetTaskData('category', value)}
              />
            </Box>
          </Stack>
        </Stack>
        <Stack space='space.050' alignInline='center'>
          <Text size='small' weight='medium'>
            Task Completion History
          </Text>
          <Calendar
            maxDate={
              taskData?.isActive ? dateToString(new Date()) : '1970-01-01'
            }
            selected={taskData.history ?? []}
            onSelect={handleSetHistory}
          />
        </Stack>
      </Inline>
      {taskDataHasChanged && (
        <Inline space='space.100'>
          <Box xcss={{ width: '75px' }}>
            <Button
              shouldFitContainer
              appearance='primary'
              onClick={handleUpdateTask}>
              Save
            </Button>
          </Box>
          <Box xcss={{ width: '75px' }}>
            <Button
              shouldFitContainer
              appearance='subtle'
              onClick={fetchTaskData}>
              Cancel
            </Button>
          </Box>
        </Inline>
      )}
    </Stack>
  ) : (
    <Box xcss={{ paddingTop: 'space.200' }}>
      <Button iconBefore='task' appearance='primary' onClick={handleAddTask}>
        Start Tracking with LongHabit
      </Button>
    </Box>
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <IssuePanel />
  </React.StrictMode>
)
