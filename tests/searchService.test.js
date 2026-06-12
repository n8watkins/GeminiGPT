/**
 * Search Service unit tests
 *
 * These tests run fully offline: the Google Custom Search HTTP call (axios) and
 * the vector database are mocked, so assertions match exactly what
 * searchService.js actually produces.
 *
 * searchService.js reads the API keys at module load time, so each scenario is
 * loaded in an isolated module registry with the desired env, and the freshly
 * required axios mock is returned alongside the service.
 */

const mockSearchChats = jest.fn();
jest.mock('../vectorDB', () => ({ searchChats: mockSearchChats }));
jest.mock('axios');

function setEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function loadService(env = {}) {
  let service;
  let axios;
  jest.isolateModules(() => {
    setEnv('GOOGLE_SEARCH_API_KEY', env.apiKey);
    setEnv('GOOGLE_SEARCH_ENGINE_ID', env.engineId);
    axios = require('axios');
    service = require('../searchService');
  });
  return { ...service, axios };
}

const REAL_KEYS = { apiKey: 'real_key', engineId: 'real_engine' };

const sampleItems = {
  data: {
    items: [
      { title: 'Result One', link: 'https://example.com/1', snippet: 'First snippet' },
      { title: 'Result Two', link: 'https://example.com/2', snippet: 'Second snippet' },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('searchGoogle', () => {
  test('maps API items to {title, link, snippet}', async () => {
    const { searchGoogle, axios } = loadService(REAL_KEYS);
    axios.get.mockResolvedValue(sampleItems);

    const results = await searchGoogle('anything');

    expect(axios.get).toHaveBeenCalledWith(
      'https://www.googleapis.com/customsearch/v1',
      expect.objectContaining({ params: expect.objectContaining({ q: 'anything' }) })
    );
    expect(results).toEqual([
      { title: 'Result One', link: 'https://example.com/1', snippet: 'First snippet' },
      { title: 'Result Two', link: 'https://example.com/2', snippet: 'Second snippet' },
    ]);
  });

  test('returns [] when the request fails', async () => {
    const { searchGoogle, axios } = loadService(REAL_KEYS);
    axios.get.mockRejectedValue(new Error('network down'));

    expect(await searchGoogle('anything')).toEqual([]);
  });
});

describe('getStockPrice', () => {
  test('returns a config message when API keys are missing', async () => {
    const { getStockPrice, axios } = loadService({ apiKey: undefined, engineId: undefined });

    const result = await getStockPrice('aapl');

    expect(result).toContain('Stock Information for AAPL');
    expect(result).toContain('configure Google Search API keys');
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('formats search results when keys are configured', async () => {
    const { getStockPrice, axios } = loadService(REAL_KEYS);
    axios.get.mockResolvedValue(sampleItems);

    const result = await getStockPrice('AAPL');

    expect(result).toContain('Current stock information for AAPL:');
    expect(result).toContain('Result One');
    expect(result).toContain('https://example.com/1');
  });

  test('handles an empty result set', async () => {
    const { getStockPrice, axios } = loadService(REAL_KEYS);
    axios.get.mockResolvedValue({ data: { items: [] } });

    expect(await getStockPrice('AAPL')).toContain("couldn't find current stock price");
  });
});

describe('getWeather', () => {
  test('returns a config message when API keys are missing', async () => {
    const { getWeather } = loadService({ apiKey: undefined, engineId: undefined });

    const result = await getWeather('Oregon');

    expect(result).toContain('Weather in Oregon');
    expect(result).toContain('configure Google Search API keys');
  });

  test('formats search results when keys are configured', async () => {
    const { getWeather, axios } = loadService(REAL_KEYS);
    axios.get.mockResolvedValue(sampleItems);

    const result = await getWeather('Oregon');

    expect(result).toContain('Current weather information for Oregon:');
    expect(result).toContain('Result Two');
  });
});

describe('getGeneralSearch', () => {
  test('returns demo results for the placeholder API key', async () => {
    const { getGeneralSearch, axios } = loadService({
      apiKey: 'your_google_search_api_key_here',
      engineId: 'anything',
    });

    const result = await getGeneralSearch('AI news');

    expect(result).toContain('Search Results for "AI news"');
    expect(result).toContain('Wikipedia');
    expect(result).toContain('demo results');
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('formats live search results when keys are configured', async () => {
    const { getGeneralSearch, axios } = loadService(REAL_KEYS);
    axios.get.mockResolvedValue(sampleItems);

    const result = await getGeneralSearch('renewable energy');

    expect(result).toContain('Search results for "renewable energy":');
    expect(result).toContain('Result One');
  });
});

describe('getTime', () => {
  test('returns a formatted time string for a known location', async () => {
    const { getTime } = loadService(REAL_KEYS);

    const result = await getTime('Tokyo');

    expect(result).toContain('Current Time in Tokyo');
    expect(result).toContain('Time zone: Asia/Tokyo');
  });

  test('defaults unknown locations to New York time', async () => {
    const { getTime } = loadService(REAL_KEYS);

    const result = await getTime('Atlantis');

    expect(result).toContain('Time zone: America/New_York');
  });
});

describe('searchChatHistory', () => {
  test('formats matches from the vector database', async () => {
    mockSearchChats.mockResolvedValue([
      {
        content: 'We discussed deployment last week',
        role: 'assistant',
        chat_title: 'Deploy chat',
        timestamp: Date.now(),
      },
    ]);
    const { searchChatHistory } = loadService(REAL_KEYS);

    const result = await searchChatHistory('USER-1', 'deployment');

    expect(mockSearchChats).toHaveBeenCalledWith('USER-1', 'deployment', 5, { apiKey: null });
    expect(result).toContain('Chat History Search for "deployment"');
    expect(result).toContain('Deploy chat');
    expect(result).toContain('We discussed deployment last week');
  });

  test('reports when there are no matches', async () => {
    mockSearchChats.mockResolvedValue([]);
    const { searchChatHistory } = loadService(REAL_KEYS);

    const result = await searchChatHistory('USER-1', 'nothing');

    expect(result).toContain("couldn't find any relevant information");
  });
});
