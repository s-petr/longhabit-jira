import { invoke, view } from '@forge/bridge'
import ForgeReconciler, {
  Button,
  Checkbox,
  Label,
  Spinner,
  Stack,
  Textfield
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task, TaskMetadata } from 'src/schemas/task'

function AppPage() {
  const [taskData, setTaskData] = useState<TaskMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const data: Task | null = await invoke('getTask')
        console.log('Task Data:', data)
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
    if (!taskData) return
    await invoke('setTask', taskData)
    await view.refresh()
  }

  return isLoading ? (
    <Spinner size='large' label='loading' />
  ) : (
    <Stack space='space.200'>
      {taskData?.isActive ? (
        <>
          <Button onClick={handleHideTask}>Stop tracking</Button>
          <Checkbox label='Set a goal to repeat regularly' />
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
