### Scheduler for Jira tickets

[Demo](https://m-thompson-code.github.io/jira-story-scheduler/)

### Public functions

`getScheduleFromCsv(csvString, developerCount, pointsPerSprint)`

`getScheduleFromJson(rawIssueArray, developerCount, pointsPerSprint)`

1. `csvString` or `rawIssueArray` should include all Jira issues
2. `developerCount` is the number of expected developers than can work in parallel
3. `pointsPerSprint`is the ammount of points expected to complete per sprint

### Schema

Schema expected for `csvString` or `rawIssueArray`:

1. `key` - Jira Ticket #
2. `points` - points to complete
3. `priority` - priority compared to all other tickets: "Low" | "Medium" | "High" | "Critical"
4. `summary` - title of Jira Ticket
5. `epic` - Jira Ticket's epic Jira Ticket #
6. `type` - `Epic` or `Story`
7. `dependencies` - List of `Epic` or `Story` Jira Ticket that must be completed before this ticket. Comma separated: `X-1, X-2, X-3`
