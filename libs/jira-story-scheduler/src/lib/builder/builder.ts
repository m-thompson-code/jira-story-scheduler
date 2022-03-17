import { parse as csvToJson } from 'csv/browser/esm/sync';
import { getIssue } from '../issues';
import { Issue, RawIssue } from '../jira-story-scheduler.model';

export const fromJson = (rawIssues: RawIssue[]): Issue[] => {
    return rawIssues
        .filter(rawIssue => rawIssue.status !== "closed" && rawIssue.status !== "Closed")
        .map((rawIssue) => getIssue(rawIssue));
}

export const fromCsv = (csvString: string): Issue[] => {
    const json = csvToJson(csvString, {
        columns: true,
        skip_empty_lines: true
    }) as unknown as RawIssue[];

    return fromJson(json);
}
