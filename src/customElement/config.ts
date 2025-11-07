export type Config = Readonly<{
  apiKey: string;
  database: string;
  collection: string;
  selectMode: 'single' | 'multiple';
  displayField?: string;
  valueField?: string;
  query?: string;
}>;

export const isConfig = (value: Readonly<Record<string, unknown>> | null): value is Config => {
  if (!value) {
    return false;
  }

  const apiKey = value.apiKey;
  const database = value.database;
  const collection = value.collection;
  const selectMode = value.selectMode;
  const displayField = value.displayField;
  const valueField = value.valueField;
  const query = value.query;

  const isString = (input: unknown): input is string => typeof input === 'string' && input.trim().length > 0;

  if (!isString(apiKey) || !isString(database) || !isString(collection)) {
    return false;
  }

  if (selectMode !== 'single' && selectMode !== 'multiple') {
    return false;
  }

  if (displayField !== undefined && typeof displayField !== 'string') {
    return false;
  }

  if (valueField !== undefined && typeof valueField !== 'string') {
    return false;
  }

  if (query !== undefined && typeof query !== 'string') {
    return false;
  }

  return true;
};
