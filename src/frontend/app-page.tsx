import { invoke } from '@forge/bridge'
import { ViewIssueModal } from '@forge/jira-bridge'
import ForgeReconciler, { DynamicTable, Lozenge, Pressable } from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task } from 'src/schemas/task'
import { getTaskStatusLabels } from '../utils/task-status'

const head = {
  cells: Object.entries({
    issueKey: 'Issue',
    name: 'Name',
    category: 'Category',
    lastDate: 'Last Date',
    repeats: 'Repeats',
    nextDate: 'Next Date',
    status: 'Status'
  }).map(([key, content]) => ({ key, content, isSortable: true }))
}

const UserIssues = () => {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const data: Task[] = await invoke('getActiveTasksData')
        setTasks(data || [])
      } catch (error) {
        console.error('Error:', error)
      }
    }
    fetchIssues()
  }, [])

  const handleOpenIssue = (issueKey: string) => {
    const modal = new ViewIssueModal({ context: { issueKey } })
    modal.open()
  }

  const rows = tasks.map((task, index) => {
    const { lastDateText, nextDateText, daysText, taskIsLate } =
      getTaskStatusLabels(
        task.repeatGoalEnabled,
        task.daysRepeat ?? 0,
        task.history ?? []
      )

    const statusColor = task.repeatGoalEnabled
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
        }
      ]
    }
  })
  return (
    <>
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
