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

export const taskMetadataSchema = z.object({
  issueKey: z.string().min(1).max(255),
  isActive: z.boolean(),
  category: z.string().min(1).max(100).optional(),
  daysRepeat: z.coerce.number().int().min(1).optional(),
  history: z.array(taskHistoryDateSchema).optional()
})

export const taskMetadataKvResponse = z.array(
  z.object({
    key: z.string().min(1).max(255),
    value: taskMetadataSchema.omit({ issueKey: true })
  })
)

export const taskSchema = taskMetadataSchema.extend({
  name: z.string().min(1).max(255),
  project: z.string().min(1).max(255),
  status: z.string().min(1).max(255)
})

export type TaskMetadata = z.infer<typeof taskMetadataSchema>
export type Task = z.infer<typeof taskSchema>
