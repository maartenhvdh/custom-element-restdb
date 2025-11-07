# Kontent.ai RestDB.io Custom Element

This project delivers a ready-to-deploy custom element for [Kontent.ai](https://kontent.ai/) that lets editors pick entries from a [RestDB.io](https://restdb.io/) collection. It supports single or multi select, client-side searching, and saves the selected RestDB identifiers back into your Kontent.ai item.

## Features

- Fetches RestDB.io records via API key, database, and collection configuration
- Single or multiple selection modes with persisted selections
- Inline search box to filter large datasets without a page reload
- Graceful handling of disabled states, network errors, and empty results
- Built with React, TypeScript, and Vite for fast local development and easy deployment

## Quick Start

```bash
npm ci
npm run dev
```

Open the local preview URL that Vite prints in the terminal. Kontent.ai will load the same bundle when you deploy it.

## Configuration in Kontent.ai

When registering the custom element in Kontent.ai, provide the configuration JSON used by the component. Example:

```json
{
  "apiKey": "<your-restdb-api-key>",
  "database": "analytics-779a",
  "collection": "oil-meal",
  "selectMode": "multiple",
  "displayField": "name",
  "valueField": "_id",
  "query": "{ \"status\": \"published\" }"
}
```

- `apiKey`, `database`, `collection`: required connection details for RestDB.io.
- `selectMode`: `single` or `multiple` to control editor selections.
- `displayField` (optional): field shown in the dropdown. Falls back to `name`, `title`, `label`, or `_id`.
- `valueField` (optional): field saved in Kontent.ai. Defaults to the RestDB `_id`.
- `query` (optional): RestDB Mongo-style filter to reduce the dataset.

## Value Stored in Kontent.ai

The element stores a JSON object containing the selected IDs:

```json
{
  "selectedIds": ["67890", "12345"]
}
```

When editors clear the selection the value becomes `null`.

## Local Development

- `npm run dev`: start Vite with hot module replacement.
- `npm run build`: type-check with TypeScript and build the production bundle into `dist`.
- `npm run preview`: serve the built bundle locally.

The project uses `CustomElementContext` to read configuration and manage value updates. `IntegrationApp.tsx` contains the UI logic for fetching RestDB.io data, searching, and presenting the dropdown.

## Deployment

The build output in `dist` is static and can be hosted on any CDN. To deploy on [Vercel](https://vercel.com/):

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel and choose the **Vite** framework preset.
3. Keep the default build command (`npm run build`) and output directory (`dist`).
4. Deploy. Use the generated URL as the custom element host in Kontent.ai.

If you later want to hide the RestDB API key, move the fetch logic into a Vercel Edge/Serverless function and set the key as an environment variable there.

## Project Structure Highlights

- `src/IntegrationApp.tsx`: Main UI logic including RestDB fetch, search, and selection handling.
- `src/customElement/config.ts`: Defines and validates the configuration schema passed from Kontent.ai.
- `src/customElement/value.ts`: Serializes and parses the stored selection.
- `src/customElement/CustomElementContext.tsx`: Bridges the Kontent.ai Custom Element API with React.

## Resources

- Kontent.ai Custom Elements documentation: https://kontent.ai/learn/docs/custom-elements
- RestDB.io REST API guide: https://restdb.io/docs/rest-api

## License

Distributed under the MIT License. See [`LICENSE.md`](./LICENSE.md) for details.
