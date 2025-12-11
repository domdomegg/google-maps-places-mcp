// Google Places API (New) configuration and utilities

export const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

// Common helper to create base headers for OAuth
function createBaseHeaders(accessToken: string): Record<string, string> {
	return {
		Authorization: `Bearer ${accessToken}`,
		'Content-Type': 'application/json',
	};
}

// Common helper to handle API errors
async function handleApiError(response: Response): Promise<never> {
	const errorText = await response.text();
	throw new Error(`Places API error: ${response.status} ${response.statusText} - ${errorText}`);
}

// Common helper to parse JSON response
async function parseJsonResponse(response: Response): Promise<unknown> {
	if (!response.ok) {
		await handleApiError(response);
	}

	const responseText = await response.text();

	if (!responseText.trim()) {
		return {success: true, message: 'Operation completed successfully'};
	}

	try {
		return JSON.parse(responseText);
	} catch (error) {
		throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
	}
}

// Utility function to make Places API POST calls (for text search)
export async function makePlacesApiCall(
	endpoint: string,
	accessToken: string,
	body: unknown,
	fieldMask: string,
) {
	const url = `${PLACES_API_BASE_URL}${endpoint}`;
	const headers = createBaseHeaders(accessToken);
	headers['X-Goog-FieldMask'] = fieldMask;

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});

	return parseJsonResponse(response);
}

// Utility function to get photo media URL (returns the photoUri)
export async function getPlacesPhotoUrl(
	photoName: string,
	accessToken: string,
	maxHeightPx?: number,
	maxWidthPx?: number,
): Promise<string> {
	const params = new URLSearchParams();
	if (maxHeightPx) {
		params.set('maxHeightPx', maxHeightPx.toString());
	}

	if (maxWidthPx) {
		params.set('maxWidthPx', maxWidthPx.toString());
	}

	// Need at least one dimension
	if (!maxHeightPx && !maxWidthPx) {
		params.set('maxHeightPx', '400');
	}

	params.set('skipHttpRedirect', 'true');

	const url = `${PLACES_API_BASE_URL}/${photoName}/media?${params.toString()}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		await handleApiError(response);
	}

	const data = await response.json() as {photoUri: string};
	return data.photoUri;
}
