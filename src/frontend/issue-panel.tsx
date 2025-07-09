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
import { Task } from 'src/schemas/task'

function AppPage() {
  const [taskData, setTaskData] = useState<Task | null>(null)
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

  return isLoading ? (
    <Spinner size='large' label='loading' />
  ) : (
    <Stack space='space.200'>
      {taskData?.isActive ? (
        <>
          <Button onClick={handleHideTask}>Stop tracking</Button>
          <Checkbox label='Set a goal to repeat regularly' />
          <Label labelFor='days-repeat'>Repeat every x days</Label>
          <Textfield id='days-repeat' />
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
