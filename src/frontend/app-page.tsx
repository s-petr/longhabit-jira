import { invoke } from '@forge/bridge'
import { ViewIssueModal } from '@forge/jira-bridge'
import ForgeReconciler, {
  Box,
  DynamicTable,
  Inline,
  Label,
  Lozenge,
  Pressable,
  Select,
  Stack,
  Textfield,
  User,
  UserPicker,
  UserPickerValue,
  xcss
} from '@forge/react'
import React, { useEffect, useState } from 'react'
import { Task } from '../schemas/task'
import { dateToString } from '../utils/date-convert'
import { getTaskStatusLabels } from '../utils/task-status'
import TaskDoneButton from './components/task-done-button'

const head = {
  cells: Object.entries({
    issueKey: 'Issue',
    name: 'Name',
    assignee: 'Assignee',
    category: 'Category',
    lastDate: 'Last Date',
    repeats: 'Repeats',
    nextDate: 'Next Date',
    status: 'Status',
    done: 'Mark Done'
  }).map(([key, content]) => ({ key, content, isSortable: true }))
}

function AppPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskIsUpdating, setTaskIsUpdating] = useState('')
  const [projectFilter, setProjectFilter] = useState<string[]>([])
  const [userFilter, setUserFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [nameFilter, setNameFilter] = useState('')

  const projectList = Array.from(
    new Set(tasks.map((task) => task.issueKey.split('-')[0]))
  )

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

  const filteredTasks = tasks
    .filter(
      (task) =>
        !projectFilter.length ||
        projectFilter.some((project) => project === task.issueKey.split('-')[0])
    )
    .filter(
      (task) => !userFilter.length || userFilter.includes(task?.assignee ?? '')
    )
    .filter(
      (task) =>
        !categoryFilter.length || categoryFilter.includes(task?.category ?? '')
    )
    .filter(
      (task) =>
        !nameFilter ||
        new RegExp(nameFilter.replace(/\s+/g, ''), 'gi').test(
          task.name.replace(/\s+/g, '')
        )
    )

  const rows = filteredTasks.map((task, index) => {
    const createKey = (
      colName: string,
      rowKey: string | number | boolean | null | undefined
    ) => {
      const putLastKey = '\uFFFF\uFFFF\uFFFF'
      const invalidValues = [
        true,
        false,
        null,
        undefined,
        '',
        Infinity,
        -Infinity,
        NaN
      ]
      const rowSortKey = invalidValues.includes(
        typeof rowKey === 'string' ? rowKey.trim() : rowKey
      )
        ? putLastKey
        : String(rowKey).replace(/\s/g, '')
      return `${colName}-${rowSortKey}`
    }

    const {
      lastDate,
      lastDateText,
      nextDate,
      nextDateText,
      dueInDays,
      daysSince,
      daysText,
      statusColor
    } = getTaskStatusLabels(
      task.repeatGoalEnabled,
      task.daysRepeat ?? 0,
      task.history ?? []
    )

    const doneToday = task.history.at(-1) === dateToString(new Date())

    const dueDaysSortOrder =
      task.repeatGoalEnabled &&
      Number(task.daysRepeat) > 0 &&
      Number(lastDate) > 0
        ? dueInDays
        : daysSince || Infinity

    return {
      key: `row-${index}-${task.issueKey}`,
      cells: [
        {
          key: createKey('issue', task.issueKey),
          content: (
            <Pressable
              xcss={{
                color: 'color.text.accent.blue'
              }}
              onClick={() => handleOpenIssue(task.issueKey)}>
              {task.issueKey}
            </Pressable>
          )
        },
        { key: createKey('name', task.name), content: task.name },
        {
          key: createKey('assignee', task.assignee ?? 'unassigned'),
          content: (
            <Box xcss={xcss({ height: '50px' })}>
              <User accountId={task.assignee ?? ''} />
            </Box>
          )
        },
        {
          key: createKey('category', task.category),
          content: task?.category
        },
        {
          key: createKey('last-date', lastDate?.getTime()),
          content: lastDateText
        },
        {
          key: createKey(
            'days-repeat-',
            task.repeatGoalEnabled && task.daysRepeat
          ),
          content: task.repeatGoalEnabled
            ? task.daysRepeat === 1
              ? 'every day'
              : `every ${task.daysRepeat} days`
            : 'no goal'
        },
        {
          key: createKey(
            'next-date',
            (task.repeatGoalEnabled && nextDate?.getTime()) || null
          ),
          content: nextDateText
        },
        {
          key: dueDaysSortOrder,
          content: (
            <Lozenge isBold appearance={statusColor}>
              {daysText}
            </Lozenge>
          )
        },
        {
          key: createKey('done', doneToday ? '1' : '0'),
          content: (
            <TaskDoneButton
              task={task}
              isUpdating={taskIsUpdating === task.issueKey}
              onDone={handleTaskDone}
              onUndo={handleUndoTaskDone}
            />
          )
        }
      ]
    }
  })
  return (
    <>
      <Inline space='space.200' alignBlock='end'>
        <Box xcss={{ minWidth: '150px' }}>
          <Stack space='space.050'>
            <Label labelFor='category-filter'>Project</Label>
            <Select
              isMulti
              placeholder=''
              id='project-filter'
              value={projectFilter.map((project) => ({
                label: project,
                value: project
              }))}
              options={projectList.map((project) => ({
                label: project,
                value: project
              }))}
              onChange={(selected) =>
                setProjectFilter(
                  selected.map(
                    (project: { label: string; value: string }) => project.value
                  )
                )
              }
            />
          </Stack>
        </Box>

        <Box xcss={{ minWidth: '150px' }}>
          <Stack space='space.050'>
            <UserPicker
              isMulti
              label='Assignee'
              placeholder='Filter by assignee'
              name='assignee'
              onChange={(users: unknown) =>
                setUserFilter(
                  (users as UserPickerValue[]).map((user) => user.id)
                )
              }
            />
          </Stack>
        </Box>

        <Box xcss={{ minWidth: '150px' }}>
          <Stack space='space.050'>
            <Label labelFor='category-filter'>Category</Label>
            <Select
              isMulti
              placeholder=''
              id='category-filter'
              value={categoryFilter.map((category) => ({
                label: category,
                value: category
              }))}
              options={[
                ...new Set(tasks.map((task) => task.category).filter(Boolean))
              ].map((category) => ({ label: category, value: category }))}
              onChange={(selected) =>
                setCategoryFilter(
                  selected.map(
                    (category: { label: string; value: string }) =>
                      category.value
                  )
                )
              }
            />
          </Stack>
        </Box>

        <Box xcss={{ minWidth: '250px' }}>
          <Stack space='space.050'>
            <Label labelFor='name-filter'>Issue Name</Label>
            <Textfield
              id='name-filter'
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </Stack>
        </Box>
      </Inline>
      <DynamicTable
        rowsPerPage={10}
        head={head}
        rows={rows}
        defaultSortKey='issueKey'
      />
    </>
  )
}

ForgeReconciler.render(
  <React.StrictMode>
    <AppPage />
  </React.StrictMode>
)
