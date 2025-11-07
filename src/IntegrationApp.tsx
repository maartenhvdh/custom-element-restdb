import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return allOptions;
    }

    const matches = allOptions.filter(option =>
      option.label.toLowerCase().includes(normalizedSearch) || option.value.toLowerCase().includes(normalizedSearch)
    );

    if (!isMultiple) {
      return matches;
    }

    const selectedOptionValues = new Set(selectedIds);
    const merged = new Map<string, typeof allOptions[number]>();

    const ensureUnique = (option: typeof allOptions[number]) => {
      if (!merged.has(option.value)) {
        merged.set(option.value, option);
      }
    };

    allOptions
      .filter(option => selectedOptionValues.has(option.value))
      .forEach(ensureUnique);
    matches.forEach(ensureUnique);

    return Array.from(merged.values());
  }, [allOptions, normalizedSearch, isMultiple, selectedIds]);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isDropdownOpen) {
      setSearchTerm('');
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDisabled) {
      setIsDropdownOpen(false);
    }
  }, [isDisabled]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSelection = () => {
    setElementValue(null);
    setIsDropdownOpen(false);
  };

  const selectSingleValue = (value: string | null) => {
    if (isDisabled) {
      return;
    }

    if (!value) {
      setElementValue(null);
    } else {
      setElementValue(createValue([value]));
    }

    setIsDropdownOpen(false);
  };

  const toggleMultiValue = (value: string) => {
    if (isDisabled) {
      return;
    }

    const isAlreadySelected = selectedIds.includes(value);
    const nextValues = isAlreadySelected ? selectedIds.filter(id => id !== value) : [...selectedIds, value];

    setElementValue(nextValues.length === 0 ? null : createValue(nextValues));
  };

  const isLoading = fetchState === 'loading';
  const isDropdownDisabled = isDisabled || isLoading || fetchState === 'error';
  const selectedOptionDetails = useMemo(() => selectedIds.map(id => {
    const option = allOptions.find(item => item.value === id);
    return option ?? { value: id, label: id };
  }), [selectedIds, allOptions]);

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

      <section style={{ marginTop: '1rem' }}>
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <button
            type="button"
            onClick={() => {
              if (!isDropdownDisabled) {
                setIsDropdownOpen(prev => !prev);
              }
            }}
            disabled={isDropdownDisabled}
            style={{
              width: '100%',
              padding: '.75rem',
              borderRadius: '.5rem',
              border: '1px solid #d1d5db',
              background: isDropdownDisabled ? '#f3f4f6' : '#fff',
              cursor: isDropdownDisabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
            }}
          >
            {isMultiple
              ? `${selectedIds.length} selected`
              : selectedOptionDetails[0]?.label ?? 'Select an option'}
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                zIndex: 10,
                width: '100%',
                maxHeight: '24rem',
                display: 'flex',
                flexDirection: 'column',
                marginTop: '.5rem',
                borderRadius: '.75rem',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
                background: '#fff',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '.75rem', borderBottom: '1px solid #e5e7eb' }}>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Type to filter results"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '.5rem .75rem',
                    borderRadius: '.5rem',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>

              <div style={{ maxHeight: '16rem', overflowY: 'auto', flex: '1 1 auto', overscrollBehavior: 'contain' }}>
                {fetchState === 'loading' && (
                  <p style={{ padding: '1rem', color: '#6b7280' }}>Loading…</p>
                )}

                {fetchState === 'success' && filteredOptions.length === 0 && (
                  <p style={{ padding: '1rem', color: '#6b7280' }}>No entries match your search.</p>
                )}

                {filteredOptions.map(option => (
                  <div
                    key={option.value}
                    style={{
                      padding: '.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.75rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {isMultiple ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.75rem', width: '100%' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(option.value)}
                          onChange={() => toggleMultiValue(option.value)}
                        />
                        <span style={{ flexGrow: 1 }}>{option.label}</span>
                        <code style={{ background: '#f3f4f6', padding: '.25rem .5rem', borderRadius: '.5rem' }}>{option.value}</code>
                      </label>
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectSingleValue(option.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{option.label}</span>
                        <code style={{ background: '#f3f4f6', padding: '.25rem .5rem', borderRadius: '.5rem' }}>{option.value}</code>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ padding: '.75rem', display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexShrink: 0, borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  style={{
                    padding: '.5rem .75rem',
                    borderRadius: '.5rem',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    style={{
                      padding: '.5rem .75rem',
                      borderRadius: '.5rem',
                      border: '1px solid transparent',
                      background: '#2563eb',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <strong>Current selection:</strong>
        {selectedOptionDetails.length === 0 ? (
          <p style={{ color: '#6b7280', marginTop: '.5rem' }}>No entries selected.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '.75rem 0 0 0', display: 'grid', gap: '.5rem' }}>
            {selectedOptionDetails.map(option => (
              <li
                key={option.value}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '.5rem',
                  padding: '.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '.75rem',
                }}
              >
                <span>{option.label}</span>
                <code style={{ background: '#f3f4f6', padding: '.25rem .5rem', borderRadius: '.5rem' }}>{option.value}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isLoading && <p>Loading data…</p>}
    </div>
  );
};

IntegrationApp.displayName = 'IntegrationApp';
