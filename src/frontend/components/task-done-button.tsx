import { Box, Button, LoadingButton } from '@forge/react'
import React from 'react'
import { TaskMetadata } from '../../schemas/task'
import { dateToString } from '../../utils/date-convert'

export default function TaskDoneButton({
  task,
  isUpdating = false,
  onDone = () => {},
  onUndo = () => {}
}: {
  task: TaskMetadata
  onDone?: (issueKey: string) => void
  onUndo?: (issueKey: string) => void
  isUpdating?: boolean
}) {
  const doneToday = task.history.at(-1) === dateToString(new Date())

  return isUpdating ? (
    <Box xcss={{ width: '100px' }}>
      <LoadingButton shouldFitContainer isLoading spacing='compact'>
        Updating...
      </LoadingButton>
    </Box>
  ) : doneToday ? (
    <Box xcss={{ width: '100px' }}>
      <Button
        shouldFitContainer
        iconBefore='undo'
        appearance='subtle'
        spacing='compact'
        onClick={() => onUndo(task.issueKey)}>
        Undo
      </Button>
    </Box>
  ) : (
    <Box xcss={{ width: '100px' }}>
      <Button
        shouldFitContainer
        iconBefore='check'
        appearance='primary'
        spacing='compact'
        onClick={() => onDone(task.issueKey)}>
        Done
      </Button>
    </Box>
  )
}
