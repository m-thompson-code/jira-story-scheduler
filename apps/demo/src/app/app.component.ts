import { Component } from '@angular/core';
import { stringify as jsonToCsv } from 'csv/browser/esm/sync';
import { Bucket, CapturedIssue, getAllCapturedIssues, getArrayFromMap2, getHeaviestBucket, getScheduleFromCsv, Issue, IssueMap } from 'jira-story-scheduler';
import { combineLatest, from, map, Observable, startWith, Subject, switchMap, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

const POINTS_PER_SPRINT = 6;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IssueUI extends Issue {}

export interface CapturedIssueUI extends CapturedIssue {
    value: IssueUI;
    hovered?: boolean;
    clicked?: boolean;
    isDependent?: boolean;
    hasDependency?: boolean;
    width: string;
    horizontalOffset: string;
}

export interface BucketUI extends Bucket {
    issues: CapturedIssueUI[];
}

export interface PointMarkerUI {
    points: number;
    position: string;
    sprint: number;
}

@Component({
    selector: 'demo-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    filesUploaded = new Subject<FileList>();
    issueMap$: Observable<IssueMap>;
    epicMap$: Observable<Map<string, IssueMap>>;
    buckets$: Observable<Bucket[]>;
    bucketsUI$: Observable<BucketUI[]>;

    pointMarkers$: Observable<PointMarkerUI[]>;
    bucketsWidth$: Observable<string>;

    hovered$ = new Subject<CapturedIssueUI | null>();
    clicked$ = new Subject<CapturedIssueUI | null>();

    epicColors: Record<string, string | undefined> = {};

    isLoading = false;
    
    constructor() {
        const source$ = this.filesUploaded.pipe(
            tap(() => this.isLoading = true),
            switchMap(file => from(file[0].text())),
            map((value) => getScheduleFromCsv(value, 10)),
            tap(_ => {
                // https://material.io/design/color/the-color-system.html#tools-for-picking-colors

                const colors = [
                    "#EF5350",
                    "#EC407A",
                    "#BA68C8",
                    "#9575CD",
                    "#7986CB",
                    "#1E88E5",
                    "#26A69A",
                    "#66BB6A",
                    "#CDDC39",
                    "#FF7043",
                    // "#90A4AE"// Used if ticket has no epic
                ];

                getArrayFromMap2(_.epicMap).forEach(({ key }, index) => {
                    this.epicColors[key] = colors[index % colors.length];
                });
            }),
            tap(console.log),
            tap(() => this.isLoading = false),
            shareReplay(1),
        );

        this.issueMap$ = source$.pipe(map((source) => source.issueMap));

        this.epicMap$ = source$.pipe(map((source) => source.epicMap));

        this.buckets$ = source$.pipe(map((source) => source.buckets));

        const heaviestBucketWeight$ = this.buckets$.pipe(
            map((buckets) => getHeaviestBucket(buckets)),
            map((filteredBucket) => filteredBucket?.weight ?? 0),
        );

        this.bucketsWidth$ = heaviestBucketWeight$.pipe(
            map((filteredBucketWeight) => `${filteredBucketWeight * 100}px`)
        );

        this.pointMarkers$ = heaviestBucketWeight$.pipe(
            map((filteredBucketWeight) => Array.from({
                length: filteredBucketWeight + 1 }, (_, i) => ({
                points: i,
                position: `${i * 100}px`,
                sprint: i % POINTS_PER_SPRINT === 0 ? (i / POINTS_PER_SPRINT + 1) : 0
            })))
        );

        this.bucketsUI$ = combineLatest([
            this.buckets$,
            this.hovered$.pipe(startWith(null)),
            this.clicked$.pipe(startWith(null)),
        ]).pipe(
            map(([buckets, hoveredCapturedIssue, clickedCapturedIssue]) => {
                const showDependentsFor = hoveredCapturedIssue ?? clickedCapturedIssue;

                return buckets.map(bucket => {
                    const issues: CapturedIssueUI[] = bucket.issues.map(issue => ({
                        ...issue,
                        clicked: !!clickedCapturedIssue?.value.key && (clickedCapturedIssue?.value.key === issue.value.key),
                        hovered: !!hoveredCapturedIssue?.value.key && (hoveredCapturedIssue?.value.key === issue.value.key),
                        isDependent: showDependentsFor?.value.nestedDependencies.has(issue.value.key) ?? false,
                        hasDependency: showDependentsFor?.value.key ? issue?.value.nestedDependencies.has(showDependentsFor.value.key) : false,
                        width: `${issue.value.points * 100}px`,
                        horizontalOffset: `${issue.weightBefore * 100}px`,
                    }));

                    return {
                        ...bucket,
                        issues,
                    };
                });
            })
        );
    }

    handleHover(capturedIssue: CapturedIssueUI | null): void {
        this.hovered$.next(capturedIssue ?? null);
    }

    handleClick(capturedIssue: CapturedIssueUI | null): void {
        this.clicked$.next(capturedIssue ?? null);
    }

    trackByIndex(index: number): number {
        return index;
    }

    trackByCapturedIssue(index: number, capturedIssue: CapturedIssueUI): string {
        return capturedIssue.value.key;
    }

    formatBucketsIntoCsv(buckets: Bucket[]): {columns: string[], csvJson: unknown[]} {
        const issues = getAllCapturedIssues(buckets);

        let i = 0;

        const columns: string[] = [];
        const csvJson: unknown[] = [];

        while(issues.length) {
            if (i > 100) {
                console.error(columns, csvJson, issues);
                throw new Error("Unexpected inf loop");
            }

            const filteredIssues = issues.filter(issue => issue.weightBefore < POINTS_PER_SPRINT * (i + 1) && issue.weightBefore >= POINTS_PER_SPRINT * i);
            
            if (!filteredIssues.length) {
                break;
            }

            const field = `Sprint ${i + 1}`;
            columns.push(field);

            filteredIssues.forEach(issue => {
                csvJson.push({
                    [field]: issue.value.key,
                });
            });

            i++;
        }

        return { columns, csvJson };
    }

    // Download / Upload

    download(buckets: Bucket[]): void {
        const { csvJson, columns } = this.formatBucketsIntoCsv(buckets);
        console.log(csvJson, columns);
        const csvString = jsonToCsv(csvJson, { header: true, columns });
        console.log(csvString);

        this.downloadAsCSV(csvString, `Sprint Planning - ${POINTS_PER_SPRINT / 2} week sprints`);
    }

    /**
     * source: https://stackoverflow.com/a/24922761
     * @param blob 
     */
    downloadAsCSV(csvFile: string, filename: string): void {
        const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
        
        if ((navigator as any).msSaveBlob) { // IE 10+
            (navigator as any).msSaveBlob(blob, filename);
        } else {
            const link = document.createElement("a");
            if (link.download !== undefined) { // feature detection
                // Browsers that support HTML5 download attribute
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }

    handleFilesUploaded(event: any): void {
        this.filesUploaded.next(event);
    }
}
