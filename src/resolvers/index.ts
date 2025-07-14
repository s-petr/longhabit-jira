import api, { route } from '@forge/api'
import { kvs, WhereConditions } from '@forge/kvs'
import Resolver from '@forge/resolver'
import {
  Task,
  TaskMetadata,
  taskMetadataKvResponse,
  taskMetadataSchema
} from '../schemas/task'
import { dateToString, getNextDueDate } from '../utils/date-convert'

const TASK_KEY_PREFIX = 'task-'

const kvKeyToIssueKey = (kvKey: string) =>
  kvKey.replace(new RegExp(`^${TASK_KEY_PREFIX}`), '')

const issueKeyToKvKey = (issueKey: string) => TASK_KEY_PREFIX + issueKey

const resolver = new Resolver()

const getTaskByKey = async (issueKey: string) => {
  const data: TaskMetadata | undefined = await kvs.get(
    issueKeyToKvKey(issueKey)
  )
  if (!data) return null
  data.issueKey = issueKey
  const { success: taskIsValid, data: taskData } =
    taskMetadataSchema.safeParse(data)
  return taskIsValid ? taskData : null
}

const getActiveTasksMetadata = async (): Promise<TaskMetadata[]> => {
  const results = []
  let cursor: any

  do {
    const { results: result, nextCursor } = await kvs
      .query()
      .where('key', WhereConditions.beginsWith(TASK_KEY_PREFIX))
      .cursor(cursor)
      .getMany()

    results.push(...result)
    cursor = nextCursor
  } while (cursor)

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

const getTaskMetadata = async (issueKey: string) => {
  const { value } =
    (await kvs
      .query()
      .where('key', WhereConditions.beginsWith(issueKeyToKvKey(issueKey)))
      .getOne()) ?? {}

  const { success: isValid, data: taskMetadata } =
    taskMetadataSchema.safeParse(value)
  return isValid ? taskMetadata : null
}

const getActiveTasksList = (tasksMetadata: TaskMetadata[]) =>
  tasksMetadata.map((task) => task.issueKey)

const updateDueDate = async (task: TaskMetadata) => {
  const daysRepeat = Number(task.daysRepeat)
  if (!task.repeatGoalEnabled || !daysRepeat || !task.history.length)
    return clearDueDate(task.issueKey)
  const lastDate = task.history.at(-1)
  if (!lastDate) return

  const nextDate = getNextDueDate(task.history, daysRepeat)

  await api.asUser().requestJira(route`/rest/api/3/issue/${task.issueKey}`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      fields: { duedate: nextDate }
    })
  })
}

const clearDueDate = async (issueKey: string) => {
  await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      fields: { duedate: null }
    })
  })
}

resolver.define('getActiveTasksData', async () => {
  try {
    const tasksMetadata = await getActiveTasksMetadata()
    if (!tasksMetadata.length) return []

    const query = route`/rest/api/3/search?jql=creator=currentUser() AND key in (${getActiveTasksList(tasksMetadata).join(',')})&maxResults=100&fields=summary,status,project`
    const response = await api
      .asUser()
      .requestJira(query)
      .then((res) => res.json())

    const table: Task[] = response?.issues
      .map((issue: any) => {
        const issueKey = issue?.key
        const metadata = tasksMetadata.find(
          (taskMetadata) => taskMetadata.issueKey === issueKey
        )
        if (!metadata) return null
        return {
          issueKey,
          name: issue?.fields?.summary,
          category: metadata?.category,
          repeatGoalEnabled: metadata.repeatGoalEnabled,
          daysRepeat: metadata?.daysRepeat,
          history: metadata?.history,
          project: issue?.fields?.project?.name,
          status: issue?.fields?.status?.name
        }
      })
      .filter(Boolean)

    return table
  } catch (error) {
    console.error('Error fetching issues:', error)
    throw error
  }
})

resolver.define('getTask', async (req: any) => {
  const issueKey = req?.context?.extension?.issue?.key
  if (!issueKey) return null
  const taskData = await getTaskByKey(issueKey)
  return taskData
})

resolver.define('setTask', async (req: any) => {
  const { success: isValidTask, data: newTaskData } =
    taskMetadataSchema.safeParse(req?.payload)
  if (!isValidTask) return

  const taskMetadata = await getTaskByKey(newTaskData.issueKey)
  if (!taskMetadata) return

  const updatedTaskMetadata = {
    ...taskMetadata,
    ...('category' in newTaskData && { category: newTaskData.category }),
    ...('daysRepeat' in newTaskData && { daysRepeat: newTaskData.daysRepeat }),
    ...('repeatGoalEnabled' in newTaskData && {
      repeatGoalEnabled: newTaskData.repeatGoalEnabled
    }),
    ...('history' in newTaskData && { history: newTaskData.history })
  }

  await kvs.set(issueKeyToKvKey(newTaskData.issueKey), updatedTaskMetadata)

  if (updatedTaskMetadata.history.length)
    await updateDueDate(updatedTaskMetadata)
})

resolver.define('taskDone', async (req: any) => {
  const issueKey = req?.payload?.issueKey
  const dateDone = req?.payload?.dateDone ?? dateToString(new Date())
  if (!issueKey) return
  const taskMetaData = await getTaskMetadata(issueKey)
  if (!taskMetaData || taskMetaData.history?.includes(dateDone)) return

  const newTaskMetadata = {
    ...taskMetaData,
    history: [...taskMetaData.history, dateDone].sort()
  }

  await kvs.set(issueKeyToKvKey(issueKey), newTaskMetadata)

  await updateDueDate(newTaskMetadata)
})

resolver.define('undoTaskDone', async (req: any) => {
  const issueKey = req?.payload?.issueKey
  const dateDone = req?.payload?.dateDone ?? dateToString(new Date())
  if (!issueKey) return
  const taskMetaData = await getTaskMetadata(issueKey)
  if (!taskMetaData || !taskMetaData.history?.includes(dateDone)) return

  const newTaskMetadata = {
    ...taskMetaData,
    history: taskMetaData.history.filter((date) => date !== dateDone)
  }

  await kvs.set(issueKeyToKvKey(issueKey), newTaskMetadata)

  await updateDueDate(newTaskMetadata)
})

resolver.define('addTask', async (req: any) => {
  const issueKey = req?.context?.extension?.issue?.key
  if (!issueKey) return
  const taskMetadata = await getTaskByKey(issueKey)

  if (taskMetadata) {
    if (!taskMetadata.isActive) {
      await kvs.set(issueKeyToKvKey(issueKey), {
        ...taskMetadata,
        isActive: true
      })
      if (taskMetadata.history.length) await updateDueDate(taskMetadata)
    }
  } else {
    await kvs.set(issueKeyToKvKey(issueKey), { isActive: true, history: [] })
  }
})

resolver.define('hideTask', async (req: any) => {
  const issueKey = req?.context?.extension?.issue?.key
  if (!issueKey) return
  const taskMetadata = await getTaskByKey(issueKey)

  if (taskMetadata)
    await kvs.set(issueKeyToKvKey(issueKey), {
      ...taskMetadata,
      isActive: false
    })

  await clearDueDate(issueKey)
})

export const handler = resolver.getDefinitions()
