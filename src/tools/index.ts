import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';

import {registerPlacesTextSearch} from './places-text-search.js';
import {registerPlacesPhotoGet} from './places-photo-get.js';

export type {Config} from './types.js';

export function registerAll(server: McpServer, config: Config): void {
	registerPlacesTextSearch(server, config);
	registerPlacesPhotoGet(server, config);
}
