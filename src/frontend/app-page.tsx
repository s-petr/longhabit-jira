import { invoke } from '@forge/bridge'
import { ViewIssueModal } from '@forge/jira-bridge'
import ForgeReconciler, {
  DynamicTable,
  Heading,
  Pressable,
  Text
} from '@forge/react'
import React, { useEffect, useState } from 'react'

type Task = {
  key: string
  name: string
  project: string
  status: string
}

const head = {
  cells: Object.entries({
    key: 'Key',
    name: 'Name',
    project: 'Project',
    status: 'Status'
  }).map(([key, content]) => ({ key, content, isSortable: true }))
}

const UserIssues = () => {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const data: any = await invoke('getActiveTasksData')
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
    cells: Object.entries(task).map(([key, content]) => ({
      key,
      content:
        key === 'key' ? (
          <Pressable onClick={() => handleOpenIssue(content)}>
            {content}
          </Pressable>
        ) : (
          content
        )
    }))
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
