export enum Priority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
    CRITICAL = 'Critical',
}

export enum IssueType {
    STORY = 'Story',
    EPIC = 'Epic',
}

export interface RawIssue {
    key: string;
    points: string;
    priority: Priority;
    summary: string;
    sprint: string;
    status: string;
    type: IssueType;
    epic: string;
    dependencies: string;
}

export interface Issue {
    key: string;
    points: number;
    priority: Priority;
    summary: string;
    type: IssueType;
    epic?: string;
    dependencies: IssueMap;
    nestedDependencies: IssueMap;
    dependencyOf: IssueMap;
    nestedDependencyOf: IssueMap;
    dependencyKeys: string[];
    sprint?: number;
}

export type IssueMap = Map<string, Issue>;
export type EpicMap = Map<string, IssueMap>;

export interface CapturedIssue {
    value: Issue;
    weightBefore: number;
    weightAfter: number;
    sprint: number;
}

export interface Bucket {
    weight: number;
    issues: CapturedIssue[];
}
