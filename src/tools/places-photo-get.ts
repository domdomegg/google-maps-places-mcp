import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {getPlacesPhotoUrl} from '../utils/places-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	photoName: z.string().describe('The photo resource name from a text search response (format: places/PLACE_ID/photos/PHOTO_RESOURCE)'),
	maxHeightPx: z.number().min(1).max(4800).optional().describe('Maximum height in pixels (1-4800)'),
	maxWidthPx: z.number().min(1).max(4800).optional().describe('Maximum width in pixels (1-4800)'),
}, {});

const outputSchema = z.object({
	photoUri: z.string().describe('URL to the photo image'),
});

export function registerPlacesPhotoGet(server: McpServer, config: Config): void {
	server.registerTool(
		'photo_get',
		{
			title: 'Get Place Photo',
			description: 'Get a photo URL for a place. Use the photo name from a text search response. At least one of maxHeightPx or maxWidthPx should be specified.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({photoName, maxHeightPx, maxWidthPx}) => {
			const photoUri = await getPlacesPhotoUrl(photoName, config.token, maxHeightPx, maxWidthPx);
			return jsonResult({photoUri});
		},
	);
}
