import { Priority } from "../jira-story-scheduler.model";

export const getPriorityNumericValue = (priority: Priority): number => {
    switch (priority) {
        case Priority.CRITICAL:
            return 4;
        case Priority.HIGH:
            return 3;
        case Priority.MEDIUM:
            return 2;
        case Priority.LOW:
            return 1;
        default:
            return 0;
    }
}
