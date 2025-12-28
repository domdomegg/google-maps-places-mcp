import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePlacesApiCall} from '../utils/places-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	textQuery: z.string().describe('The text query to search for places (e.g., "pizza in New York" or "coffee shops near me")'),
	languageCode: z.string().optional().describe('Language code for results (e.g., "en", "fr")'),
	regionCode: z.string().optional().describe('Region code for result localization (e.g., "US", "GB")'),
	rankPreference: z.enum(['RELEVANCE', 'DISTANCE']).optional().describe('How to rank results'),
	includedType: z.string().optional().describe('Restrict to a specific place type (see Google Place Types)'),
	openNow: z.boolean().optional().describe('Only return places that are currently open'),
	minRating: z.number().min(0).max(5).optional().describe('Minimum average user rating (0.0 to 5.0)'),
	priceLevels: z.array(z.enum(['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'])).optional().describe('Filter by price levels'),
	pageSize: z.number().min(1).max(20).optional().describe('Number of results per page (default 20, max 20)'),
	pageToken: z.string().optional().describe('Token from previous response for pagination'),
	locationBias: z.object({
		circle: z.object({
			center: z.object({
				latitude: z.number(),
				longitude: z.number(),
			}),
			radius: z.number().describe('Radius in meters'),
		}).optional(),
		rectangle: z.object({
			low: z.object({latitude: z.number(), longitude: z.number()}),
			high: z.object({latitude: z.number(), longitude: z.number()}),
		}).optional(),
	}).optional().describe('Prefer results near this location'),
	locationRestriction: z.object({
		rectangle: z.object({
			low: z.object({latitude: z.number(), longitude: z.number()}),
			high: z.object({latitude: z.number(), longitude: z.number()}),
		}),
	}).optional().describe('Only return results within this area'),
}, {});

// Place response schema
const placeSchema = z.object({
	name: z.string().optional().describe('Resource name (places/PLACE_ID)'),
	id: z.string().optional().describe('Place ID'),
	displayName: z.object({
		text: z.string(),
		languageCode: z.string().optional(),
	}).optional(),
	formattedAddress: z.string().optional(),
	shortFormattedAddress: z.string().optional(),
	location: z.object({
		latitude: z.number(),
		longitude: z.number(),
	}).optional(),
	rating: z.number().optional(),
	userRatingCount: z.number().optional(),
	priceLevel: z.string().optional(),
	types: z.array(z.string()).optional(),
	primaryType: z.string().optional(),
	primaryTypeDisplayName: z.object({
		text: z.string(),
		languageCode: z.string().optional(),
	}).optional(),
	regularOpeningHours: z.object({
		openNow: z.boolean().optional(),
		periods: z.array(z.object({
			open: z.object({
				day: z.number(),
				hour: z.number(),
				minute: z.number(),
			}).optional(),
			close: z.object({
				day: z.number(),
				hour: z.number(),
				minute: z.number(),
			}).optional(),
		})).optional(),
		weekdayDescriptions: z.array(z.string()).optional(),
	}).optional(),
	currentOpeningHours: z.object({
		openNow: z.boolean().optional(),
		weekdayDescriptions: z.array(z.string()).optional(),
	}).optional(),
	nationalPhoneNumber: z.string().optional(),
	internationalPhoneNumber: z.string().optional(),
	websiteUri: z.string().optional(),
	googleMapsUri: z.string().optional(),
	photos: z.array(z.object({
		name: z.string(),
		widthPx: z.number().optional(),
		heightPx: z.number().optional(),
		authorAttributions: z.array(z.object({
			displayName: z.string().optional(),
			uri: z.string().optional(),
			photoUri: z.string().optional(),
		})).optional(),
	})).optional(),
	reviews: z.array(z.object({
		name: z.string().optional(),
		rating: z.number().optional(),
		text: z.object({text: z.string(), languageCode: z.string().optional()}).optional(),
		authorAttribution: z.object({displayName: z.string().optional()}).optional(),
		publishTime: z.string().optional(),
	})).optional(),
	editorialSummary: z.object({
		text: z.string(),
		languageCode: z.string().optional(),
	}).optional(),
	priceRange: z.object({
		startPrice: z.object({currencyCode: z.string(), units: z.string()}).optional(),
		endPrice: z.object({currencyCode: z.string(), units: z.string()}).optional(),
	}).optional(),
}).passthrough();

const outputSchema = z.object({
	places: z.array(placeSchema).optional(),
	nextPageToken: z.string().optional(),
	searchUri: z.string().optional(),
});

export function registerPlacesTextSearch(server: McpServer, config: Config): void {
	server.registerTool(
		'text_search',
		{
			title: 'Search Places',
			description: 'Search for places using a text query. Returns place details including name, address, rating, opening hours, photos, and more.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const body: Record<string, unknown> = {
				textQuery: args.textQuery,
			};

			if (args.languageCode) {
				body.languageCode = args.languageCode;
			}

			if (args.regionCode) {
				body.regionCode = args.regionCode;
			}

			if (args.rankPreference) {
				body.rankPreference = args.rankPreference;
			}

			if (args.includedType) {
				body.includedType = args.includedType;
			}

			if (args.openNow !== undefined) {
				body.openNow = args.openNow;
			}

			if (args.minRating !== undefined) {
				body.minRating = args.minRating;
			}

			if (args.priceLevels?.length) {
				body.priceLevels = args.priceLevels;
			}

			if (args.pageSize) {
				body.pageSize = args.pageSize;
			}

			if (args.pageToken) {
				body.pageToken = args.pageToken;
			}

			if (args.locationBias) {
				body.locationBias = args.locationBias;
			}

			if (args.locationRestriction) {
				body.locationRestriction = args.locationRestriction;
			}

			// Request comprehensive field mask for place details
			const fieldMask = [
				'places.name',
				'places.id',
				'places.displayName',
				'places.formattedAddress',
				'places.shortFormattedAddress',
				'places.location',
				'places.rating',
				'places.userRatingCount',
				'places.priceLevel',
				'places.types',
				'places.primaryType',
				'places.primaryTypeDisplayName',
				'places.regularOpeningHours',
				'places.currentOpeningHours',
				'places.nationalPhoneNumber',
				'places.internationalPhoneNumber',
				'places.websiteUri',
				'places.googleMapsUri',
				'places.photos',
				'places.reviews',
				'places.editorialSummary',
				'places.priceRange',
				'nextPageToken',
				'searchUri',
			].join(',');

			const result = await makePlacesApiCall('/places:searchText', config.token, body, fieldMask);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
