import { OnInitHookCallback, uiModificationsApi } from '@forge/jira-bridge'

const log = console.log
console.log = (...args) => {
  log('UI modifications app,', ...args)
}

const onInitCallback: OnInitHookCallback = async ({ api, uiModifications }) => {
  console.log('UI MODIFICATIONS API TRIGGERED')
  console.log(api)
  console.log(uiModifications)

  const dueDateField = api.getFieldById('duedate')
  dueDateField && dueDateField.setReadOnly(true)
}

uiModificationsApi.onInit(onInitCallback, () => {
  return ['duedate']
})
