import { getBuckets } from './buckets';
import { fromCsv, fromJson } from './builder';
import { moo2 } from './issues';
import { IssueMap, EpicMap, Bucket, RawIssue } from './jira-story-scheduler.model';

export const getScheduleFromCsv = (csvString: string, developers: number, pointsPerSprint: number): { issueMap: IssueMap, epicMap: EpicMap, buckets: Bucket[] } => {
    const issues = fromCsv(csvString);

    const { issueMap, epicMap }  = moo2(issues);

    const buckets = getBuckets(issueMap, epicMap, developers, pointsPerSprint);

    return { issueMap, epicMap, buckets };
}

export const getScheduleFromJson = (rawIssues: RawIssue[], developers: number, pointsPerSprint: number): { issueMap: IssueMap, epicMap: EpicMap, buckets: Bucket[] } => {
    const issues = fromJson(rawIssues);

    const { issueMap, epicMap }  = moo2(issues);

    const buckets = getBuckets(issueMap, epicMap, developers, pointsPerSprint);

    return { issueMap, epicMap, buckets };
}
