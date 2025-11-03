/**
 * API Route definitions and their parameters
 *
 * This file documents all API routes in the Release Tracker system
 * and their expected request/response types.
 */

import type {
	CreateReleaseEventRequest,
	CreateReleaseEventResponse,
	ReleaseTrackerState,
} from "./types";

/**
 * API Route: POST /release_events/create
 *
 * Creates a new release pipeline event (version update or feature merge)
 * and updates the release tracker state accordingly.
 *
 * Route: POST /release_events/create
 *
 * Request Body:
 * @see CreateReleaseEventRequest
 *
 * Response:
 * @see CreateReleaseEventResponse
 *
 * Example Request:
 * ```json
 * {
 *   "event": {
 *     "event_type": "feature_merged",
 *     "repo": "tscircuit/core",
 *     "feature_name": "Introduce Ground Pours"
 *   }
 * }
 * ```
 *
 * Example Response:
 * ```json
 * {
 *   "success": true,
 *   "message": "Event created successfully"
 * }
 * ```
 */
export interface CreateReleaseEventRoute {
	method: "POST";
	path: "/release_events/create";
	requestBody: CreateReleaseEventRequest;
	response: CreateReleaseEventResponse;
}

/**
 * API Route: GET /state
 *
 * Retrieves the current state of the release tracker system.
 *
 * Route: GET /state
 *
 * Request Parameters: None
 *
 * Response: The complete ReleaseTrackerState
 *
 * Example Response:
 * ```json
 * {
 *   "repoGraph": {
 *     "tscircuit/core": {
 *       "upstream_edge": null,
 *       "downstream_edges": ["tscircuit/eval"]
 *     },
 *     "tscircuit/eval": {
 *       "upstream_edge": "tscircuit/core",
 *       "downstream_edges": ["tscircuit/runframe", "tscircuit.com"]
 *     }
 *   },
 *   "repoStates": {
 *     "tscircuit/core@0.1.2": {
 *       "merged_features": ["Introduce Ground Nets", "Introduce Ground Pours"],
 *       "queued_features": [],
 *       "upstream_features": []
 *     },
 *     "tscircuit/eval@5.7.2": {
 *       "merged_features": ["Introduce Ground Nets"],
 *       "queued_features": ["Introduce Ground Pours"],
 *       "upstream_features": ["Introduce Ground Pours"]
 *     }
 *   }
 * }
 * ```
 */
export interface GetStateRoute {
	method: "GET";
	path: "/state";
	requestBody: null;
	response: ReleaseTrackerState;
}

/**
 * API Route: GET /
 *
 * Root route - serves the web interface for simulating events and viewing state.
 *
 * Route: GET /
 *
 * Request Parameters: None
 *
 * Response: HTML page
 */
export interface GetRootRoute {
	method: "GET";
	path: "/";
	requestBody: null;
	response: string; // HTML
}

/**
 * Union type of all API routes for type checking
 */
export type ApiRoute = CreateReleaseEventRoute | GetStateRoute | GetRootRoute;

/**
 * Route definitions map for easy lookup
 */
export const ROUTES = {
	CREATE_RELEASE_EVENT: {
		method: "POST" as const,
		path: "/release_events/create" as const,
	},
	GET_STATE: {
		method: "GET" as const,
		path: "/state" as const,
	},
	GET_ROOT: {
		method: "GET" as const,
		path: "/" as const,
	},
} as const;
