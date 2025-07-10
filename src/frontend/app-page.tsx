import { invoke } from '@forge/bridge'
import { ViewIssueModal } from '@forge/jira-bridge'
import ForgeReconciler, {
  DynamicTable,
  Heading,
  Pressable,
  Text
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task } from 'src/schemas/task'

const head = {
  cells: Object.entries({
    issueKey: 'Issue Key',
    name: 'Name',
    project: 'Project',
    category: 'Category',
    daysRepeat: 'Days Repeat',
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

  const rows = tasks.map((task, index) => ({
    key: `row-${index}`,
    cells: [
      {
        key: 'issueKey',
        content: (
          <Pressable onClick={() => handleOpenIssue(task.issueKey)}>
            {task.issueKey}
          </Pressable>
        )
      },
      { key: 'name', content: task.name },
      { key: 'project', content: task.project },
      { key: 'category', content: task?.category },
      { key: 'daysRepeat', content: task?.daysRepeat },
      { key: 'status', content: task.status }
    ]
  }))
  return (
    <>
      <DynamicTable caption='Tasks List' head={head} rows={rows} />
    </>
  )
}

function AppPage() {
  return (
    <>
      <Heading>Long Habit App</Heading>
      <Text>
        This will be the page with the recurring tasks summary. Will show all
        recurring tasks across all projects that are visible to the user
      </Text>
      <UserIssues />
    </>
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <AppPage />
  </React.StrictMode>
)
