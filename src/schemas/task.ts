import { isValid, parse } from 'date-fns'
import { z } from 'zod/v4'

const taskHistoryDateSchema = z.string().refine((date) => {
  try {
    const parsedDate = parse(date, 'yyyy-MM-dd', new Date())
    return isValid(parsedDate)
  } catch {
    return false
  }
}, 'Invalid date. Must use format yyyy-MM-dd')

export const taskDataSchema = z.object({
  isActive: z.boolean(),
  history: z.array(taskHistoryDateSchema)
})

export type Task = z.infer<typeof taskDataSchema>
