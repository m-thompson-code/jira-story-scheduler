import { Issue } from "../jira-story-scheduler.model";
import { getPriorityNumericValue } from "../priority/priority";

export const compareIssues = (a: Issue, b: Issue): number => {
    const priorityA = getPriorityNumericValue(a.priority);
    const priorityB = getPriorityNumericValue(b.priority);
  
    const priorityDelta = priorityB - priorityA;
  
    if (!priorityDelta) {
      return a.points - b.points;
    }
  
    return priorityDelta;
  }
  
export const compareIssueDependencies = (a: Issue, b: Issue): number => {
    const nestedDependencyOfDelta = b.nestedDependencyOf.size - a.nestedDependencyOf.size;
  
    if (nestedDependencyOfDelta) {
      return nestedDependencyOfDelta;
    }
  
    return compareIssues(a, b);
}
