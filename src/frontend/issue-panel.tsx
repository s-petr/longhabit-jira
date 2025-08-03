import { invoke, view } from '@forge/bridge'
import ForgeReconciler, {
  Box,
  Button,
  Calendar,
  Heading,
  Inline,
  Label,
  Lozenge,
  ProgressBar,
  Stack,
  Text,
  Textfield,
  Toggle
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task, TaskMetadata } from '../schemas/task'
import { dateToString } from '../utils/date-convert'
import { getTaskStatusLabels } from '../utils/task-status'
import Autocomplete from './components/autocomplete'
import TaskDoneButton from './components/task-done-button'

function IssuePanel() {
  const [task, setTask] = useState<TaskMetadata | null>(null)
  const [taskDataHasChanged, setTaskDataHasChanged] = useState(false)
  const [categoriesList, setCategoriesList] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTaskData = async () => {
    try {
      setIsLoading(true)
      const taskData: Task | null = await invoke('getTask')
      const categoriesData: string[] = await invoke('getCategoriesList')
      setTask(taskData)
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
    if (!task) return
    await invoke('setTask', task)
    await view.refresh()
  }

  const handleTaskDone = async (issueKey: string) => {
    try {
      await invoke('taskDone', { issueKey, dateDone: dateToString(new Date()) })
      await view.refresh()
    } catch (error) {
      console.error(error)
    }
  }

  const handleUndoTaskDone = async (issueKey: string) => {
    try {
      await invoke('undoTaskDone', {
        issueKey,
        dateDone: dateToString(new Date())
      })
      await view.refresh()
    } catch (error) {
      console.error(error)
    }
  }

  const handleSetTaskData = (key: keyof TaskMetadata, value: any) => {
    if (!task || task[key] === value) return
    setTaskDataHasChanged(true)
    setTask((current) => ({
      ...current!,
      [key]: value
    }))
  }

  const handleSetHistory = (e: any) => {
    const selectedDay = e?.iso
    const currentHistory = task?.history ?? []
    const newHistory = currentHistory.includes(selectedDay)
      ? currentHistory.filter((day) => day !== selectedDay)
      : [...currentHistory, selectedDay].sort()

    handleSetTaskData('history', newHistory)
  }

  const { lastDateText, nextDateText, daysText, statusColor } =
    getTaskStatusLabels(
      !!task?.repeatGoalEnabled,
      task?.daysRepeat ?? 0,
      task?.history ?? []
    )

  return isLoading || !task ? (
    <Box xcss={{ paddingTop: 'space.400' }}>
      <ProgressBar isIndeterminate ariaLabel='Loading task details' />
    </Box>
  ) : task?.isActive || taskDataHasChanged ? (
    <Stack space='space.100'>
      <Inline
        shouldWrap
        space='space.400'
        alignInline='start'
        spread='space-between'>
        <Box
          xcss={{
            marginTop: 'space.200',
            backgroundColor: 'elevation.surface.raised',
            boxShadow: 'elevation.shadow.raised',
            borderStyle: 'solid',
            borderWidth: 'border.width',
            borderColor: 'color.border',
            borderRadius: 'border.radius',
            padding: 'space.200'
          }}>
          <Stack space='space.100'>
            <Heading as='h3' size='small'>
              Task Settings
            </Heading>

            <Box xcss={{ paddingTop: 'space.200' }}>
              <Inline space='space.100' alignBlock='center'>
                <Toggle
                  id='active'
                  size='large'
                  isChecked={!!task?.isActive}
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
                isChecked={!!task.repeatGoalEnabled}
                isDisabled={!task?.isActive}
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
                value={task.daysRepeat}
                isDisabled={!task.repeatGoalEnabled || !task?.isActive}
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
                  value={task.category ?? ''}
                  isDisabled={!task?.isActive}
                  onChange={(value) => handleSetTaskData('category', value)}
                />
              </Box>
            </Stack>

            <Box xcss={{ paddingTop: 'space.200' }}>
              <Inline spread='space-between' alignBlock='center'>
                <Text size='small' weight='medium'>
                  Task Completion History
                </Text>
                <Button
                  appearance='subtle'
                  iconAfter='select-clear'
                  spacing='compact'
                  isDisabled={!task?.isActive}
                  onClick={() => handleSetTaskData('history', [])}>
                  Clear
                </Button>
              </Inline>
            </Box>

            <Calendar
              maxDate={task?.isActive ? dateToString(new Date()) : '1970-01-01'}
              selected={task.history ?? []}
              onSelect={handleSetHistory}
            />

            {taskDataHasChanged && (
              <Box xcss={{ paddingTop: 'space.200' }}>
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
              </Box>
            )}
          </Stack>
        </Box>

        {task.isActive && (
          <Box
            xcss={{
              marginTop: 'space.200',
              backgroundColor: 'elevation.surface.raised',
              boxShadow: 'elevation.shadow.raised',
              borderStyle: 'solid',
              borderWidth: 'border.width',
              borderColor: 'color.border',
              borderRadius: 'border.radius',
              padding: 'space.200'
            }}>
            <Stack space='space.100'>
              <Heading as='h3' size='small'>
                Task Info
              </Heading>

              <Stack space='space.025'>
                <Text>Last Date: {lastDateText}</Text>
                <Text>Next Date: {nextDateText}</Text>
                <Text>
                  Status:{' '}
                  <Lozenge isBold appearance={statusColor}>
                    {daysText}
                  </Lozenge>
                </Text>
              </Stack>

              <Box xcss={{ paddingTop: 'space.100' }}>
                <TaskDoneButton
                  task={task}
                  onDone={handleTaskDone}
                  onUndo={handleUndoTaskDone}
                />
              </Box>
            </Stack>
          </Box>
        )}
      </Inline>
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
