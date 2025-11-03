/**
 * Type definitions for the Release Tracker API
 * Based on the README specification
 */

/**
 * Name of a repository in the tscircuit organization
 */
export type RepoName = string;

/**
 * Name of a feature or fix
 */
export type FeatureName = string;

/**
 * Semantic version string (e.g., "0.1.2", "5.7.2")
 */
export type SemverVersion = string;

/**
 * Represents the complete state of the release tracker system
 */
export interface ReleaseTrackerState {
	/**
	 * Graph structure representing relationships between repos
	 * Maps repo name to its upstream and downstream relationships
	 */
	repoGraph: Record<
		RepoName,
		{
			/** The upstream repo that this repo depends on */
			upstream_edge: RepoName;
			/** List of downstream repos that depend on this repo */
			downstream_edges: RepoName[];
		}
	>;
	/**
	 * State of each repo at each version
	 * Key format: `${RepoName}@${SemverVersion}`
	 */
	repoStates: Record<
		`${RepoName}@${SemverVersion}`,
		{
			/** Features that have been merged and released in this version */
			merged_features: FeatureName[];
			/** Features queued to be merged in the next release */
			queued_features: FeatureName[];
			/** Features from upstream repos that haven't been merged yet */
			upstream_features: FeatureName[];
		}
	>;
}

/**
 * Package.json structure (simplified for now, can be expanded)
 * TODO: Use a proper package.json type from @types/node or similar
 */
export type PackageJson = {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
};

/**
 * Event that occurs in the release pipeline
 */
export type ReleasePipelineEvent = UpdateVersionsEvent | MergeFeatureEvent;

/**
 * Event triggered when package versions are updated downstream
 */
export interface UpdateVersionsEvent {
	event_type: "versions_updated";
	/** The repo where versions were updated */
	repo: RepoName;
	/** The new version that was set */
	version: SemverVersion;
	/**
	 * The package.json is used to find upstream repos that were updated
	 * Based on dependencies, we can determine which upstream repos this repo depends on
	 */
	package_json: PackageJson;
}

/**
 * Event triggered when a feature/fix PR is merged to main
 */
export interface MergeFeatureEvent {
	event_type: "feature_merged";
	/** The repo where the feature was merged */
	repo: RepoName;
	/** The name of the feature or fix that was merged */
	feature_name: FeatureName;
}

/**
 * API Route: POST /release_events/create
 * Creates a new release pipeline event
 */
export interface CreateReleaseEventRequest {
	/** The event to create */
	event: ReleasePipelineEvent;
}

export interface CreateReleaseEventResponse {
	/** Whether the event was successfully created */
	success: boolean;
	/** Optional message about the result */
	message?: string;
}
