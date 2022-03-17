import { compareIssueDependencies } from "../comparisons/comparisons";
import { filterCapturedIssuesBySubset, getHeaviestCapturedIssue, validateIssues } from "../issues";
import { Bucket, CapturedIssue, EpicMap, Issue, IssueMap, IssueType } from "../jira-story-scheduler.model";
import { getArrayFromMap } from "../util";

export const getEmptyBuckets = (bucketCount: number): Bucket[] => {
    return Array.from({ length: bucketCount }, () => ({
      weight: 0,
      issues: [],
    }));
}

export const getBuckets = (issueMap: IssueMap, epicMap: EpicMap, count: number, pointsPerSprint: number): Bucket[] =>{
    validateIssues(issueMap, epicMap);

    return fillBuckets(
        getArrayFromMap(issueMap).filter((issue) => issue.type !== IssueType.EPIC),
        getEmptyBuckets(count),
        pointsPerSprint
    );
}
  
export const fillBuckets = (issues: Issue[], buckets: Bucket[], pointsPerSprint: number, minimumGapBetweenIssues = 0): Bucket[] => {
        const sortedIssues = issues.slice(0).sort(compareIssueDependencies);
    
        if (!sortedIssues.length) {
            addSprintsToBucket(buckets, pointsPerSprint);
            return buckets;
        }
    
        const issuesToAddInNextLoop: Issue[] = [];
    
        let pushedIssueToBucket = false;
        let _minimumGapBetweenIssues = minimumGapBetweenIssues;
        let instantAddMaximumGapTolerance = 0;
    
        sortedIssues.forEach((issue) => {
            if (pushedIssueToBucket) {
                issuesToAddInNextLoop.push(issue);
                return;
            }
        
            const allCapturedIssues = getAllCapturedIssues(buckets);
        
            const filteredCapturedNestedDependencies = filterCapturedIssuesBySubset(
                getArrayFromMap(issue.nestedDependencies),
                allCapturedIssues
            );
        
            if (filteredCapturedNestedDependencies.length !== issue.nestedDependencies.size) {
                issuesToAddInNextLoop.push(issue);
                return;
            }
        
            const heaviestCapturedDependency = getHeaviestCapturedIssue(
                filteredCapturedNestedDependencies
            );
        
            const minimumNextBucketWeight = heaviestCapturedDependency?.weightAfter ?? getLightestBucket(buckets)?.weight ?? 0;
        
            const lightestBestCaseBucket = getLightestBucket(
                buckets.filter((bucket) => bucket.weight >= minimumNextBucketWeight && bucket.weight + issue.points <= instantAddMaximumGapTolerance)
            );

            const heaviestBestCaseBucket = getHeaviestBucket(
                buckets.filter((bucket) => bucket.weight <= minimumNextBucketWeight)
            );
        
            const lightestBucket = getLightestBucket(buckets);
        
            const filteredBucket = lightestBestCaseBucket ?? heaviestBestCaseBucket ?? lightestBucket ?? buckets[0];
            
            const gap = minimumNextBucketWeight - filteredBucket.weight;
        
            const weightBefore = Math.max(filteredBucket.weight, minimumNextBucketWeight);
        
            if (gap > _minimumGapBetweenIssues) { 
                issuesToAddInNextLoop.push(issue);
                return;
            }
        
            // if (filteredBucket.weight === minimumNextBucketWeight) {
            //     console.log(filteredBucket.weight, minimumNextBucketWeight);
            // } else {
            //     console.warn(filteredBucket.weight, minimumNextBucketWeight);
            // }

            if (filteredBucket.weight < minimumNextBucketWeight) {
                issuesToAddInNextLoop.push(issue);
                return;
            }
        
            filteredBucket.weight = weightBefore + issue.points;
        
            filteredBucket.issues.push({
                weightBefore,
                value: issue,
                weightAfter: filteredBucket.weight,
                sprint: -1,
            });
        
            pushedIssueToBucket = true;
            _minimumGapBetweenIssues = 0;
            instantAddMaximumGapTolerance = 0;
        });
  
    return fillBuckets(issuesToAddInNextLoop, buckets, pointsPerSprint, _minimumGapBetweenIssues + 1);
}

export const getAllCapturedIssues = (buckets: Bucket[]): CapturedIssue[] => {
    return buckets.map((bucket) => bucket.issues).flat();
}

export const getLightestBucket = (buckets: Bucket[]): Bucket | undefined => {
    if (!buckets.length) {
        return undefined;
    }
  
    return buckets.reduce((acc, loc) => {
        if (!acc) {
            return loc;
        }
    
        if (!loc) {
            return acc;
        }
    
        if (acc.weight < loc.weight) {
            return acc;
        } else {
            return loc;
        }
    });
}


export const getHeaviestBucket = (buckets: Bucket[]): Bucket | undefined => {
    if (!buckets.length) {
        return undefined;
    }
  
    return buckets.reduce((acc, loc) => {
        if (!acc) {
            return loc;
        }
    
        if (!loc) {
            return acc;
        }
    
        if (acc.weight > loc.weight) {
            return acc;
        } else {
            return loc;
        }
    });
}


export const addSprintsToBucket = (buckets: Bucket[], pointsPerSprint: number): void => {
    const issues = getAllCapturedIssues(buckets);

    let i = 0;

    const columns: string[] = [];
    const csvJson: unknown[] = [];

    while(issues.length) {
        if (i > 100) {
            console.error(columns, csvJson, issues);
            throw new Error("Unexpected infinite loop");
        }

        const filteredIssues = issues.filter(issue => issue.weightBefore < pointsPerSprint * (i + 1) && issue.weightBefore >= pointsPerSprint * i);
        
        filteredIssues.forEach(issue => {
            issue.sprint = i + 1;//`${i}`.padStart(3)
            issue.value.sprint = i + 1;//`${i}`.padStart(3)
        });

        if (!filteredIssues.length) {
            break;
        }

        i++;
    }
}
