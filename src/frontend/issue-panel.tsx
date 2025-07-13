import { invoke, view } from '@forge/bridge'
import ForgeReconciler, {
  Box,
  Button,
  Calendar,
  Checkbox,
  Inline,
  Label,
  ProgressBar,
  Stack,
  Text,
  Textfield
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task, TaskMetadata } from '../schemas/task'
import { dateToString } from '../utils/date-convert'

function AppPage() {
  const [taskData, setTaskData] = useState<TaskMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTask = async () => {
    try {
      setIsLoading(true)
      const data: Task | null = await invoke('getTask')
      setTaskData(data)
    } catch (error) {
      console.error('Error loading task data')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTask()
  }, [])

  const handleAddTask = async () => {
    await invoke('addTask')
    await view.refresh()
  }

  const handleHideTask = async () => {
    await invoke('hideTask')
    await view.refresh()
  }

  const handleUpdateTask = async () => {
    console.log('taskData', taskData)
    if (!taskData) return
    await invoke('setTask', taskData)
    await view.refresh()
  }

  const handleSetHistory = (e: any) => {
    const selectedDay = e?.iso
    const currentHistory = taskData?.history ?? []
    const newHistory = currentHistory.includes(selectedDay)
      ? currentHistory.filter((day) => day !== selectedDay)
      : [...currentHistory, selectedDay].sort()

    taskData &&
      setTaskData((current) => ({
        ...current!,
        history: newHistory
      }))
  }

  return isLoading ? (
    <Box xcss={{ paddingTop: 'space.400' }}>
      <ProgressBar isIndeterminate ariaLabel='Loading task metadata' />
    </Box>
  ) : (
    <Stack space='space.200'>
      {taskData?.isActive ? (
        <>
          <Stack space='space.050'>
            <Label labelFor='repeat'>Repeat every x days</Label>
            <Inline space='space.100' alignBlock='center'>
              <Checkbox
                id='repeat'
                isChecked={!!taskData.repeatGoalEnabled}
                onChange={(e) =>
                  taskData &&
                  setTaskData((current) => ({
                    ...current!,
                    repeatGoalEnabled: !!e.target.checked
                  }))
                }
              />
              <Textfield
                value={taskData.daysRepeat}
                isDisabled={!taskData.repeatGoalEnabled}
                onChange={(e) =>
                  taskData &&
                  setTaskData((current) => ({
                    ...current!,
                    daysRepeat: Number(e.target.value)
                  }))
                }
              />
            </Inline>
          </Stack>
          <Stack space='space.050'>
            <Label labelFor='category'>Category</Label>
            <Textfield
              id='category'
              value={taskData.category}
              onChange={(e) =>
                taskData &&
                setTaskData((current) => ({
                  ...current!,
                  category: e.target.value
                }))
              }
            />
          </Stack>
          <Stack space='space.050'>
            <Text size='small' weight='medium'>
              Task Completion History
            </Text>
            <Calendar
              maxDate={dateToString(new Date())}
              selected={taskData.history ?? []}
              onSelect={handleSetHistory}
            />
          </Stack>
          <Inline space='space.100' alignBlock='center'>
            <Box xcss={{ width: '150px' }}>
              <Button
                shouldFitContainer
                appearance='primary'
                onClick={handleUpdateTask}>
                Update
              </Button>
            </Box>
            <Box xcss={{ width: '150px' }}>
              <Button
                shouldFitContainer
                appearance='danger'
                onClick={handleHideTask}>
                Stop Tracking
              </Button>
            </Box>
          </Inline>
        </>
      ) : (
        <Button onClick={handleAddTask}>Track with Long Habit</Button>
      )}
    </Stack>
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <AppPage />
  </React.StrictMode>
)
