import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useConfig, useIsDisabled, useValue } from './customElement/CustomElementContext';
import { createValue } from './customElement/value';

type RestDbRecord = Readonly<{ _id?: string }> & Readonly<Record<string, unknown>>;

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export const IntegrationApp = () => {
  const config = useConfig();
  const isDisabled = useIsDisabled();
  const [elementValue, setElementValue] = useValue();

  const [records, setRecords] = useState<ReadonlyArray<RestDbRecord>>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadRecords = async () => {
      setFetchState('loading');
      setErrorMessage(null);

      const baseUrl = `https://${config.database}.restdb.io/rest/${config.collection}`;
      const querySuffix = config.query ? `?q=${encodeURIComponent(config.query)}` : '';

      try {
        const response = await fetch(`${baseUrl}${querySuffix}`, {
          headers: {
            'x-apikey': config.apiKey,
            'cache-control': 'no-cache',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();

        if (!Array.isArray(payload)) {
          throw new Error('The RestDB.io response was not an array.');
        }

        setRecords(payload as ReadonlyArray<RestDbRecord>);
        setFetchState('success');
      }
      catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setFetchState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error while fetching data.');
      }
    };

    void loadRecords();

    return () => controller.abort();
  }, [config.apiKey, config.collection, config.database, config.query]);

  const selectedIds = useMemo(() => elementValue?.selectedIds ?? [], [elementValue]);
  const isMultiple = config.selectMode === 'multiple';

  const getRecordValue = (record: RestDbRecord) => {
    if (config.valueField && typeof record[config.valueField] !== 'undefined') {
      return String(record[config.valueField]);
    }
    if (typeof record._id === 'string') {
      return record._id;
    }
    return JSON.stringify(record);
  };

  const getRecordLabel = (record: RestDbRecord) => {
    if (config.displayField && typeof record[config.displayField] !== 'undefined') {
      return String(record[config.displayField]);
    }
    const fallbackField = ['name', 'title', 'label'].find(field => typeof record[field] === 'string');
    if (fallbackField) {
      return String(record[fallbackField]);
    }
    if (typeof record._id === 'string') {
      return record._id;
    }
    return 'Unknown item';
  };

  const allOptions = useMemo(() => records.map(record => ({
    value: getRecordValue(record),
    label: getRecordLabel(record),
  })), [records, config.displayField, config.valueField]);

  const handleSingleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isDisabled) {
      return;
    }

    const { value } = event.target;

    if (!value) {
      setElementValue(null);
      return;
    }

    setElementValue(createValue([value]));
  };

  const handleMultipleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isDisabled) {
      return;
    }

    const options = Array.from(event.target.selectedOptions).map(option => option.value).filter(Boolean);

    setElementValue(options.length === 0 ? null : createValue(options));
  };

  const isLoading = fetchState === 'loading';

  return (
    <div className="custom-element">
      <header>
        <h2>RestDB.io Selection</h2>
        <p>Select {isMultiple ? 'one or more entries' : 'an entry'} from `{config.collection}`.</p>
      </header>

      {fetchState === 'error' && (
        <div role="alert" style={{ color: 'red' }}>
          {errorMessage ?? 'Unable to load data from RestDB.io.'}
        </div>
      )}

      <label style={{ display: 'block', marginTop: '1rem' }}>
        <span style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>Entries</span>
        <select
          multiple={isMultiple}
          disabled={isDisabled || isLoading || allOptions.length === 0}
          value={isMultiple ? selectedIds : selectedIds[0] ?? ''}
          onChange={isMultiple ? handleMultipleChange : handleSingleChange}
          size={Math.min(Math.max(allOptions.length, isMultiple ? 4 : 1), 12)}
          style={{ width: '100%', minHeight: '3rem' }}
        >
          {!isMultiple && <option value="">Select an option</option>}
          {allOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <section style={{ marginTop: '1rem' }}>
        <strong>Current selection:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: '.75rem', borderRadius: '.5rem' }}>
          {JSON.stringify(selectedIds, null, 2)}
        </pre>
      </section>

      {isLoading && <p>Loading data…</p>}
      {!isLoading && allOptions.length === 0 && fetchState === 'success' && <p>No entries found.</p>}
    </div>
  );
};

IntegrationApp.displayName = 'IntegrationApp';
