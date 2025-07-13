import { invoke, router } from '@forge/bridge'
import { ViewIssueModal } from '@forge/jira-bridge'
import ForgeReconciler, {
  Box,
  Button,
  DynamicTable,
  Inline,
  LoadingButton,
  Lozenge,
  Pressable
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task } from '../schemas/task'
import { dateToString } from '../utils/date-convert'
import { getTaskStatusLabels } from '../utils/task-status'

const head = {
  cells: Object.entries({
    issueKey: 'Issue',
    name: 'Name',
    category: 'Category',
    lastDate: 'Last Date',
    repeats: 'Repeats',
    nextDate: 'Next Date',
    status: 'Status',
    done: 'Mark Done'
  }).map(([key, content]) => ({ key, content, isSortable: true }))
}

const UserIssues = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskIsUpdating, setTaskIsUpdating] = useState('')

  const fetchIssues = async () => {
    try {
      const data: Task[] = await invoke('getActiveTasksData')
      setTasks(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [])

  const handleOpenIssue = (issueKey: string) => {
    const modal = new ViewIssueModal({
      context: { issueKey },
      onClose: fetchIssues
    })
    modal.open()
  }

  const handleTaskDone = async (issueKey: string) => {
    try {
      setTaskIsUpdating(issueKey)
      await invoke('taskDone', { issueKey, dateDone: dateToString(new Date()) })
      await fetchIssues()
    } catch (error) {
      console.error(error)
    } finally {
      setTaskIsUpdating('')
    }
  }

  const handleUndoTaskDone = async (issueKey: string) => {
    try {
      setTaskIsUpdating(issueKey)
      await invoke('undoTaskDone', {
        issueKey,
        dateDone: dateToString(new Date())
      })
      await fetchIssues()
    } catch (error) {
      console.error(error)
    } finally {
      setTaskIsUpdating('')
    }
  }

  const rows = tasks.map((task, index) => {
    const { lastDateText, nextDateText, daysText, taskIsLate } =
      getTaskStatusLabels(
        task.repeatGoalEnabled,
        task.daysRepeat ?? 0,
        task.history ?? []
      )

    const statusColor =
      task.repeatGoalEnabled &&
      Number(task.daysRepeat) > 0 &&
      task.history.length
        ? taskIsLate
          ? 'removed'
          : 'success'
        : 'inprogress'

    return {
      key: `row-${index}`,
      cells: [
        {
          key: 'issueKey',
          content: (
            <Pressable
              xcss={{ color: 'color.text.accent.blue' }}
              onClick={() => handleOpenIssue(task.issueKey)}>
              {task.issueKey}
            </Pressable>
          )
        },
        { key: 'name', content: task.name },
        { key: 'category', content: task?.category },
        { key: 'lastDate', content: lastDateText },
        {
          key: 'repeats',
          content: (
            <Lozenge isBold={!!task.repeatGoalEnabled}>
              {task.repeatGoalEnabled
                ? task.daysRepeat === 1
                  ? 'every day'
                  : `every ${task.daysRepeat} days`
                : 'no goal'}
            </Lozenge>
          )
        },
        { key: 'nextDate', content: nextDateText },
        {
          key: 'status',
          content: (
            <Lozenge isBold appearance={statusColor}>
              {daysText}
            </Lozenge>
          )
        },
        {
          key: 'done',
          content:
            taskIsUpdating !== task.issueKey ? (
              task.history.at(-1) === dateToString(new Date()) ? (
                <Box xcss={{ width: '100px' }}>
                  <Button
                    shouldFitContainer
                    iconBefore='undo'
                    appearance='subtle'
                    spacing='compact'
                    onClick={() => handleUndoTaskDone(task.issueKey)}>
                    Undo
                  </Button>
                </Box>
              ) : (
                <Box xcss={{ width: '100px' }}>
                  <Button
                    shouldFitContainer
                    iconBefore='check'
                    appearance='primary'
                    spacing='compact'
                    onClick={() => handleTaskDone(task.issueKey)}>
                    Done
                  </Button>
                </Box>
              )
            ) : (
              <Box xcss={{ width: '100px' }}>
                <LoadingButton shouldFitContainer isLoading spacing='compact'>
                  Updating...
                </LoadingButton>
              </Box>
            )
        }
      ]
    }
  })
  return (
    <>
      <Inline space='space.200'>
        <Button iconBefore='refresh' onClick={() => router.reload()}>
          Refresh Page
        </Button>
        <Button iconBefore='refresh' onClick={() => fetchIssues()}>
          Refetch Data
        </Button>
      </Inline>
      <DynamicTable head={head} rows={rows} />
    </>
  )
}

function AppPage() {
  return (
    <>
      <UserIssues />
    </>
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <AppPage />
  </React.StrictMode>
)
