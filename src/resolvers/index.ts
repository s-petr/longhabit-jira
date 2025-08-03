import Resolver from '@forge/resolver'
import { taskMetadataSchema } from '../schemas/task'
import { dateToString } from '../utils/date-convert'
import {
  addTask,
  getActiveTasksData,
  getCategoriesList,
  getTaskByKey,
  setTask,
  taskDone,
  undoTaskDone
} from './tasks'

const resolver = new Resolver()

resolver.define('getActiveTasksData', getActiveTasksData)
resolver.define('getCategoriesList', getCategoriesList)

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
  await setTask(newTaskData)
})

resolver.define('taskDone', async (req: any) => {
  const issueKey = req?.payload?.issueKey
  if (!issueKey) return
  const dateDone = req?.payload?.dateDone ?? dateToString(new Date())
  await taskDone(issueKey, dateDone)
})

resolver.define('undoTaskDone', async (req: any) => {
  const issueKey = req?.payload?.issueKey
  if (!issueKey) return
  const dateDone = req?.payload?.dateDone ?? dateToString(new Date())
  await undoTaskDone(issueKey, dateDone)
})

resolver.define('addTask', async (req: any) => {
  const issueKey = req?.context?.extension?.issue?.key
  if (!issueKey) return
  await addTask(issueKey)
})

export const handler = resolver.getDefinitions()
