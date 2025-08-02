import {
  Task,
  TaskMetadata,
  taskMetadataKvResponse,
  taskMetadataSchema
} from '../schemas/task'
import { getNextDueDate } from '../utils/date-convert'
import { getIssues, setIssueDueDate } from './api/issues'
import { kvGetAllTasks, kvGetTask, kvKeyToIssueKey, kvSetTask } from './api/kv'

export const getTaskByKey = async (issueKey: string) => {
  const data: unknown = await kvGetTask(issueKey)
  const parsedData = taskMetadataSchema.omit({ issueKey: true }).safeParse(data)
  if (!parsedData.success) return null

  const { success: taskIsValid, data: taskData } = taskMetadataSchema.safeParse(
    { ...parsedData.data, issueKey }
  )
  return taskIsValid ? taskData : null
}

export const getActiveTasksMetadata = async (): Promise<TaskMetadata[]> => {
  const results = await kvGetAllTasks()

  const { success: responseIsValid, data: tasks } =
    taskMetadataKvResponse.safeParse(results)

  if (!responseIsValid) return []

  const activeTasks = tasks
    .filter(({ value: task }) => task.isActive)
    .map(({ key, value: task }) => ({
      ...task,
      issueKey: kvKeyToIssueKey(key)
    }))
  return activeTasks
}

export const getTaskMetadata = async (issueKey: string) => {
  const value = await kvGetTask(issueKey)

  const { success: isValid, data: taskMetadata } =
    taskMetadataSchema.safeParse(value)
  return isValid ? taskMetadata : null
}

export const getActiveTasksList = (tasksMetadata: TaskMetadata[]) =>
  tasksMetadata.map((task) => task.issueKey)

export const clearDueDate = async (issueKey: string) =>
  await setIssueDueDate(issueKey, null)

export const syncDueDate = async (task: TaskMetadata) => {
  const daysRepeat = Number(task.daysRepeat)
  const lastDate = task.history.at(-1)
  if (!lastDate) return

  if (task.repeatGoalEnabled && daysRepeat && task.history.length) {
    const nextDate = getNextDueDate(task.history, daysRepeat)
    await setIssueDueDate(task.issueKey, nextDate)
  } else {
    await clearDueDate(task.issueKey)
  }
}

export const getActiveTasksData = async () => {
  try {
    const tasksMetadata = await getActiveTasksMetadata()
    const activeTasksList = getActiveTasksList(tasksMetadata)
    if (!activeTasksList.length) return []

    const batchSize = 100
    const batches = []
    for (let i = 0; i < activeTasksList.length; i += batchSize) {
      batches.push(activeTasksList.slice(i, i + batchSize))
    }

    const responses = await Promise.all(batches.map(getIssues))

    const allIssues = responses.flatMap((response) => response?.issues || [])

    const table = allIssues
      .map((issue: any) => {
        const issueKey = issue?.key
        const metadata = tasksMetadata.find(
          (taskMetadata) => taskMetadata.issueKey === issueKey
        )
        if (!metadata) return null
        return {
          issueKey,
          isActive: metadata.isActive ?? true,
          name: issue?.fields?.summary,
          assignee: issue?.fields?.assignee?.accountId,
          category: metadata?.category,
          repeatGoalEnabled: metadata.repeatGoalEnabled,
          daysRepeat: metadata?.daysRepeat,
          history: metadata?.history,
          project: issue?.fields?.project?.name,
          status: issue?.fields?.status?.name
        }
      })
      .filter(Boolean) as Task[]

    return table
  } catch (error) {
    console.error('Error fetching issues:', error)
    throw error
  }
}

export const addTask = async (issueKey: string) => {
  const taskMetadata = await getTaskByKey(issueKey)

  if (taskMetadata) {
    if (!taskMetadata.isActive) {
      await kvSetTask(issueKey, {
        ...taskMetadata,
        isActive: true
      })
      if (taskMetadata.history.length) await syncDueDate(taskMetadata)
    }
  } else {
    await kvSetTask(issueKey, { isActive: true, history: [] })
  }
}

export const setTask = async (taskData: TaskMetadata) => {
  const taskMetadata = await getTaskByKey(taskData.issueKey)
  if (!taskMetadata) return

  const updatedTaskMetadata = {
    ...taskMetadata,
    ...('category' in taskData && { category: taskData.category }),
    ...('daysRepeat' in taskData && { daysRepeat: taskData.daysRepeat }),
    ...('repeatGoalEnabled' in taskData && {
      repeatGoalEnabled: taskData.repeatGoalEnabled
    }),
    ...('history' in taskData && { history: taskData.history })
  }

  await kvSetTask(taskData.issueKey, updatedTaskMetadata)

  if (updatedTaskMetadata.history.length) await syncDueDate(updatedTaskMetadata)
}

export const hideTask = async (issueKey: string) => {
  const taskMetadata = await getTaskByKey(issueKey)

  if (taskMetadata)
    await kvSetTask(issueKey, {
      ...taskMetadata,
      isActive: false
    })

  await clearDueDate(issueKey)
}

export const taskDone = async (issueKey: string, dateDone: string) => {
  const taskMetaData = await getTaskMetadata(issueKey)
  if (!taskMetaData || taskMetaData.history?.includes(dateDone)) return

  const newTaskMetadata = {
    ...taskMetaData,
    history: [...taskMetaData.history, dateDone].sort()
  }

  await kvSetTask(issueKey, newTaskMetadata)
  await syncDueDate(newTaskMetadata)
}

export const undoTaskDone = async (issueKey: string, dateDone: string) => {
  const taskMetaData = await getTaskMetadata(issueKey)
  if (!taskMetaData || !taskMetaData.history?.includes(dateDone)) return

  const newTaskMetadata = {
    ...taskMetaData,
    history: taskMetaData.history.filter((date) => date !== dateDone)
  }

  await kvSetTask(issueKey, newTaskMetadata)
  await syncDueDate(newTaskMetadata)
}

export const getCategoriesList = async () => {
  const activeTasks = await getActiveTasksData()
  const categories = [...new Set(activeTasks.map((task) => task.category))]
  return categories
}
