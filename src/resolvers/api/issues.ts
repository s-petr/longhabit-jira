import api, { route } from '@forge/api'

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

export const getIssues = async (issues: string[]) =>
  await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/bulkfetch`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        issueIdsOrKeys: issues,
        fields: ['summary', 'assignee', 'status', 'project']
      })
    })
    .then((res) => res.json())

export const setIssueDueDate = async (issueKey: string, dueDate: Date | null) =>
  api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({
      fields: { duedate: dueDate }
    })
  })
