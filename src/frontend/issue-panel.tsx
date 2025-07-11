import { invoke, view } from '@forge/bridge'
import ForgeReconciler, {
  Button,
  Calendar,
  Checkbox,
  Label,
  Spinner,
  Stack,
  Textfield
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task, TaskMetadata } from '../schemas/task'
import { dateToString } from '../utils/date-convert'

function AppPage() {
  const [taskData, setTaskData] = useState<TaskMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const data: Task | null = await invoke('getTask')
        setTaskData(data)
      } catch (error) {
        console.error('Error loading task data')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
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
    <Spinner size='large' label='loading' />
  ) : (
    <Stack space='space.200'>
      {taskData?.isActive ? (
        <>
          <Button onClick={handleHideTask}>Stop tracking</Button>
          <Checkbox
            label='Set a goal to repeat regularly'
            isChecked={!!taskData.repeatGoalEnabled}
            onChange={(e) =>
              taskData &&
              setTaskData((current) => ({
                ...current!,
                repeatGoalEnabled: !!e.target.checked
              }))
            }
          />
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
          <Label labelFor='days-repeat'>Repeat every x days</Label>
          <Textfield
            id='days-repeat'
            value={taskData.daysRepeat}
            onChange={(e) =>
              taskData &&
              setTaskData((current) => ({
                ...current!,
                daysRepeat: Number(e.target.value)
              }))
            }
          />
          <Calendar
            maxDate={dateToString(new Date())}
            selected={taskData.history ?? []}
            onSelect={handleSetHistory}
          />
          <Button onClick={handleUpdateTask}>Update</Button>
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
