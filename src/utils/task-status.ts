import {
  differenceInCalendarDays,
  format,
  formatDistanceStrict
} from 'date-fns'
import { TaskHistoryDate } from '../schemas/task'
import { getNextDueDate, stringToDate } from './date-convert'

type TaskStatusLabels = {
  lastDate: Date | null
  lastDateText: string
  nextDate: Date
  nextDateText: string
  dueInDays: number
  daysSince: number
  daysText: string
  taskIsLate: boolean
  statusColor: 'removed' | 'success' | 'inprogress'
}

export function getTaskStatusLabels(
  repeatGoalEnabled: boolean,
  daysRepeat: number,
  history: TaskHistoryDate[]
): TaskStatusLabels {
  const lastDate = history.at(-1) ? stringToDate(history.at(-1) ?? '') : null
  const nextDate = getNextDueDate(history, daysRepeat)

  const daysSince = lastDate
    ? differenceInCalendarDays(new Date(), lastDate)
    : 0
  const dueInDays = differenceInCalendarDays(nextDate, new Date())
  const taskIsLate = repeatGoalEnabled ? dueInDays < 0 : false

  const lastDateText = lastDate ? format(lastDate, 'dd MMM yyyy') : 'Never done'
  const nextDateText =
    repeatGoalEnabled && daysRepeat > 0 && lastDate
      ? format(nextDate, 'dd MMM yyyy')
      : 'N/A'

  let daysText

  if (repeatGoalEnabled && daysRepeat > 0 && lastDate) {
    const numDaysAbs = Math.abs(dueInDays)

    let numDaysText
    if (numDaysAbs === 1) {
      numDaysText = '1 day'
    } else if (numDaysAbs <= 45) {
      numDaysText = `${numDaysAbs} days`
    } else {
      numDaysText = formatDistanceStrict(nextDate, new Date())
    }

    if (dueInDays === 0) {
      daysText = 'due today'
    } else if (dueInDays > 0) {
      daysText = `due in ${numDaysText}`
    } else {
      daysText = `${numDaysText} late`
    }
  } else {
    if (!lastDate) {
      daysText = 'n/a'
    } else if (daysSince === 0) {
      daysText = 'done today'
    } else if (daysSince === 1) {
      daysText = '1 day since'
    } else if (daysSince <= 45) {
      daysText = `${daysSince} days since`
    } else {
      daysText = `${formatDistanceStrict(new Date(), lastDate)} since`
    }
  }

  const statusColor =
    repeatGoalEnabled && Number(daysRepeat) > 0 && history.length
      ? taskIsLate
        ? 'removed'
        : 'success'
      : 'inprogress'

  return {
    lastDate,
    lastDateText,
    nextDate,
    nextDateText,
    dueInDays,
    daysSince,
    daysText,
    taskIsLate,
    statusColor
  }
}
