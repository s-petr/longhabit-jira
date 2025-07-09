import api, { route } from '@forge/api'
import { kvs, WhereConditions } from '@forge/kvs'
import Resolver from '@forge/resolver'
import { taskDataSchema } from '../schemas/task'

const TASK_KEY_PREFIX = 'task-'

const resolver = new Resolver()

const getTaskKey = (req: any) => {
  const issueKey = req?.context?.extension?.issue?.key
  return issueKey ? TASK_KEY_PREFIX + issueKey : null
}

const getActiveTasksList = async () => {
  const { results: tasks } = await kvs
    .query()
    .where('key', WhereConditions.beginsWith(TASK_KEY_PREFIX))
    .getMany()

  if (!Array.isArray(tasks) || !tasks.length) return []

  const activeTasks = tasks
    .filter(({ value: task }) => {
      const { success: taskIsValid, data: taskParsed } =
        taskDataSchema.safeParse(task)
      return taskIsValid && taskParsed.isActive
    })
    .map(({ key }) => key.replace(new RegExp(`^${TASK_KEY_PREFIX}`), ''))
  return activeTasks
}

resolver.define('getActiveTasksData', async () => {
  try {
    const activeTasksList = await getActiveTasksList()
    if (!activeTasksList.length) return []

    const query = route`/rest/api/3/search?jql=creator=currentUser() AND key in (${activeTasksList?.join(',')})&maxResults=100&fields=summary,status,project`
    const response = await api
      .asUser()
      .requestJira(query)
      .then((res) => res.json())

    const table = response?.issues.map((issue: any) => ({
      key: issue?.key,
      name: issue?.fields?.summary,
      project: issue?.fields?.project?.name,
      status: issue?.fields?.status?.name
    }))

    return table
  } catch (error) {
    console.error('Error fetching issues:', error)
    throw error
  }
})

resolver.define('getActiveTasksList', getActiveTasksList)

resolver.define('getTask', async (req: any) => {
  const key = getTaskKey(req)
  if (!key) return null

  const { success: taskIsValid, data: taskData } = taskDataSchema.safeParse(
    await kvs.get(key)
  )

  return taskIsValid ? taskData : null
})

resolver.define('addTask', async (req: any) => {
  const key = getTaskKey(req)
  if (!key) return

  const { success: taskIsValid, data: taskData } = taskDataSchema.safeParse(
    await kvs.get(key)
  )
  if (taskIsValid) {
    if (!taskData.isActive) await kvs.set(key, { ...taskData, isActive: true })
  } else {
    await kvs.set(key, { isActive: true, history: [] })
  }
})

resolver.define('hideTask', async (req: any) => {
  const key = getTaskKey(req)
  if (!key) return

  const { success: taskIsValid, data: taskData } = taskDataSchema.safeParse(
    await kvs.get(key)
  )
  if (taskIsValid) await kvs.set(key, { ...taskData, isActive: false })
})

export const handler = resolver.getDefinitions()
