import { CapturedIssue, EpicMap, Issue, IssueMap, IssueType, RawIssue } from '../jira-story-scheduler.model';
import { getArrayFromMap, getArrayFromMap2, zeroOrNaN } from '../util/util';

/**
 * Used when issue doesn't have assigned points
 */
const DEFAULT_POINTS = .5;

export const getIssue = (rawIssue: RawIssue): Issue => {
    const points = +rawIssue.points;

    const pointsHasIssues = zeroOrNaN(points);

    if (pointsHasIssues && rawIssue.type !== IssueType.EPIC) {
        console.warn("Unexpected issue has no points, going to default to .5pt");
    }

    const { key, priority, summary, type, epic } = rawIssue;

    return {
        key, priority, summary, type, epic,
        points: pointsHasIssues ? DEFAULT_POINTS : points,
        dependencies: new Map<string, Issue>(),
        nestedDependencies: new Map<string, Issue>(),
        dependencyOf: new Map<string, Issue>(),
        nestedDependencyOf: new Map<string, Issue>(),
        dependencyKeys: rawIssue.dependencies
            .split(',')
            .map((dirtyDependencyKey) => dirtyDependencyKey.trim())
            .filter((possiblyEmptyDependencyKey) => !!possiblyEmptyDependencyKey)
            .filter((dependencyKey) => {
            if (dependencyKey === rawIssue.key) {
                console.error(rawIssue);
                throw new Error('Detected Issue that depends on itself');
            }

            return true;
        }),
    };
}

export const getIssueMap = (issues: Issue[]): IssueMap => {
    return new Map(issues.map(issue => [issue.key, issue]));
}

export const getEpicMap = (issues: Issue[]): EpicMap => {
    const epics = issues.filter(issue => issue.type === IssueType.EPIC);

    return new Map(epics.map(epic => [
        epic.key,
        getIssueMap(issues.filter(issue => issue.epic === epic.key))
    ]));
}

export const moo2 = (issues: Issue[]): { issueMap: IssueMap, epicMap: EpicMap } => {
    const issueMap = getIssueMap(issues);
    const epicMap = getEpicMap(issues);

    validateIssues(issueMap, epicMap);

    issueMap.forEach((issue) => {
      issue.dependencyKeys.forEach((dependencyKey) => {
        const dependency = issueMap.get(dependencyKey);

        if (!dependency) {
          console.error(issue, dependencyKey);
          throw new Error('Unexpected missing issue');
        }

        if (issue.key === dependencyKey) {
          console.error(issue, dependencyKey);
          throw new Error('Unexpected circular dependency');
        }

        // // Skip Epics since we will attach its issues as dependencies instead
        if (dependency.type !== IssueType.EPIC) {
          issue.dependencies.set(dependencyKey, dependency);
          dependency.dependencyOf.set(issue.key, issue);
        } else {
          const epicIssueMap = epicMap.get(dependency.key);
          if (epicIssueMap) {
            getArrayFromMap(epicIssueMap).forEach(epicDependency => {
                if (issue.key === epicDependency.key) {
                  console.error({
                    issue,
                    epicDependency,
                    issueMap,
                    epicMap,
                  });
                  throw new Error('Unexpected circular dependency');
                }

                issue.dependencies.set(epicDependency.key, epicDependency);
                epicDependency.dependencyOf.set(issue.key, issue);
              }
            );
          } else {
            console.warn("Unexpected missing dependency key for epic map", dependency.key);
          }
        }
      });
    });

    issueMap.forEach((issue) => {
      const nestedDependencies = getNestedDependencies(issue);

      nestedDependencies.forEach((dependency) => {
        issue.nestedDependencies.set(dependency.key, dependency);
        dependency.nestedDependencyOf.set(issue.key, issue);
      });
    });

    return { epicMap, issueMap };
}

export const validateIssues = (issueMap: IssueMap, epicMap: EpicMap): void => {
    const issues = getArrayFromMap2(issueMap).map(({ value: issue, key }) => {
      if (!issue.key) {
          console.error(issue, key);
          throw new Error('Unexpected missing issue key');
      }

        if (issue.key !== key) {
            console.error(issue, key);
            throw new Error('Unexpected mismatch issue key');
        }

        if (issue.key === issue.epic) {
            console.error(issue, key);
            throw new Error('Unexpected issue is its own epic');
        }

        return issue;
    }).map(issue => issue);

    issues.forEach(issue => {
        if (!issue.epic) {
            return;
        }

        if (issues.every(otherIssue => otherIssue.key !== issue.epic)) {
            console.error(issue, issue.epic);
            throw new Error('Unexpected issue has undefined epic');
        }

        if (!epicMap.has(issue.epic)) {
            console.error(issue, issue.epic);
            throw new Error('Unexpected missing epicMap');
        }
    });

    issues.forEach(issue => {
        if (getNestedIssueIncludesDependency(issue, issue)) {
            console.error(issue);
            throw new Error('Unexpected issue circular dependency found');
        }
    })
}

export const getNestedIssueIncludesDependency = (
  issue: Issue,
  possibleDependency: Issue
): boolean =>{
  const { dependencies } = issue;

  if (issue.key === possibleDependency.key) {
    return false;
  }

  if (!dependencies.size) {
    return false;
  }

  if (dependencies.has(possibleDependency.key)) {
    return true;
  }

  return getArrayFromMap(dependencies).some(dependency =>
    getNestedIssueIncludesDependency(dependency, possibleDependency) || getNestedIssueIncludesDependency(possibleDependency, dependency)
  );
}

export const getNestedDependencies = (issue: Issue): Issue[] => {
    if (!issue.dependencies.size) {
        return [];
    }

    const dependencies = getArrayFromMap(issue.dependencies);

    return [
        ...dependencies,
        ...dependencies
        .map((dependency) => getNestedDependencies(dependency))
        .flat(),
    ];
}

export const filterCapturedIssuesBySubset = (
    possibleSubset: Issue[],
    sourceIssues: CapturedIssue[]
): CapturedIssue[] => {
    return possibleSubset
      .map((issue) =>
          sourceIssues.find((sourceIssue) => sourceIssue.value.key === issue.key)
      )
      .filter((issue): issue is CapturedIssue => !!issue);
}

export const getHeaviestCapturedIssue = (
    capturedIssues: CapturedIssue[]
): CapturedIssue | undefined => {
    if (!capturedIssues.length) {
        return undefined;
    }

    return capturedIssues.reduce((acc, loc) => {
        if (!acc) {
            return loc;
        }

        if (!loc) {
          return acc;
        }

        if (acc.weightAfter > loc.weightAfter) {
            return acc;
        } else {
            return loc;
        }
    });
}
