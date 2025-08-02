import kvs, { WhereConditions } from '@forge/kvs'
import { TaskMetadata } from 'src/schemas/task'

const TASK_KEY_PREFIX = 'task-'

export const kvKeyToIssueKey = (kvKey: string) =>
  kvKey.replace(new RegExp(`^${TASK_KEY_PREFIX}`), '')

export const issueKeyToKvKey = (issueKey: string) => TASK_KEY_PREFIX + issueKey

export const kvGetTask = async (issueKey: string) =>
  kvs.get(issueKeyToKvKey(issueKey))

export const kvGetAllTasks = async () => {
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

  return results
}

export const kvSetTask = async (
  issueKey: string,
  data: Partial<TaskMetadata>
) => kvs.set(issueKeyToKvKey(issueKey), data)
