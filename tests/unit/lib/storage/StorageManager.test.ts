/**
 * Unit tests for StorageManager implementations
 *
 * @since 1.4.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LocalStorageManager,
  SessionStorageManager,
  MemoryStorageManager,
} from '../../../../src/lib/storage/StorageManager';

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

describe('LocalStorageManager', () => {
  let storage: LocalStorageManager;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      writable: true,
    });
    storage = new LocalStorageManager('test:');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should store and retrieve values', async () => {
    const testData = { id: '123', name: 'Test Product' };

    await storage.set('product', testData);
    const retrieved = await storage.get('product');

    expect(retrieved).toEqual(testData);
    expect(localStorage.setItem).toHaveBeenCalled();
    expect(localStorage.getItem).toHaveBeenCalled();
  });

  it('should handle TTL expiration', async () => {
    const testData = { id: '123' };

    // Set with 1ms TTL
    await storage.set('expiring', testData, 1);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));

    const retrieved = await storage.get('expiring');
    expect(retrieved).toBeNull();
  });

  it('should handle Date objects correctly', async () => {
    const testData = {
      createdAt: new Date('2024-09-05T10:30:00Z'),
      name: 'Test',
    };

    await storage.set('dateTest', testData);
    const retrieved = await storage.get<typeof testData>('dateTest');

    expect(retrieved?.createdAt).toBeInstanceOf(Date);
    expect(retrieved?.createdAt.toISOString()).toBe('2024-09-05T10:30:00.000Z');
  });

  it('should check if key exists', async () => {
    await storage.set('exists', 'value');

    expect(await storage.has('exists')).toBe(true);
    expect(await storage.has('notExists')).toBe(false);
  });

  it('should remove items', async () => {
    await storage.set('toRemove', 'value');
    expect(await storage.has('toRemove')).toBe(true);

    await storage.remove('toRemove');
    expect(await storage.has('toRemove')).toBe(false);
  });

  it('should clear all items', async () => {
    await storage.set('item1', 'value1');
    await storage.set('item2', 'value2');

    await storage.clear();

    expect(await storage.has('item1')).toBe(false);
    expect(await storage.has('item2')).toBe(false);
  });

  it('should handle pattern matching', async () => {
    await storage.set('product:123', 'value1');
    await storage.set('product:456', 'value2');
    await storage.set('user:789', 'value3');

    const productKeys = await storage.keys('product:*');
    const userKeys = await storage.keys('user:*');

    expect(productKeys).toHaveLength(2);
    expect(userKeys).toHaveLength(1);
    expect(productKeys).toContain('product:123');
    expect(productKeys).toContain('product:456');
  });

  it('should handle quota exceeded error', async () => {
    // Mock quota exceeded error
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    });

    await expect(storage.set('large', 'data')).rejects.toThrow(
      'Storage quota exceeded'
    );
  });
});

describe('SessionStorageManager', () => {
  let storage: SessionStorageManager;

  beforeEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: createStorageMock(),
      writable: true,
    });
    storage = new SessionStorageManager('test:');
  });

  it('should store and retrieve values in session storage', async () => {
    const testData = { session: true };

    await storage.set('sessionTest', testData);
    const retrieved = await storage.get('sessionTest');

    expect(retrieved).toEqual(testData);
    expect(sessionStorage.setItem).toHaveBeenCalled();
  });

  it('should handle TTL in session storage', async () => {
    await storage.set('expiring', 'data', 1);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));

    const retrieved = await storage.get('expiring');
    expect(retrieved).toBeNull();
  });
});

describe('MemoryStorageManager', () => {
  let storage: MemoryStorageManager;

  beforeEach(() => {
    storage = new MemoryStorageManager();
  });

  it('should store and retrieve values in memory', async () => {
    const testData = { memory: true };

    await storage.set('memoryTest', testData);
    const retrieved = await storage.get('memoryTest');

    expect(retrieved).toEqual(testData);
  });

  it('should handle TTL in memory', async () => {
    await storage.set('expiring', 'data', 1);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));

    const retrieved = await storage.get('expiring');
    expect(retrieved).toBeNull();
  });

  it('should clear all memory items', async () => {
    await storage.set('item1', 'value1');
    await storage.set('item2', 'value2');

    expect(await storage.has('item1')).toBe(true);
    expect(await storage.has('item2')).toBe(true);

    await storage.clear();

    expect(await storage.has('item1')).toBe(false);
    expect(await storage.has('item2')).toBe(false);
  });

  it('should handle pattern matching in memory', async () => {
    await storage.set('prefix:test1', 'value1');
    await storage.set('prefix:test2', 'value2');
    await storage.set('other:test', 'value3');

    const prefixKeys = await storage.keys('prefix:*');
    expect(prefixKeys).toHaveLength(2);
    expect(prefixKeys).toContain('prefix:test1');
    expect(prefixKeys).toContain('prefix:test2');
  });

  it('should return all keys when no pattern specified', async () => {
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');

    const allKeys = await storage.keys();
    expect(allKeys).toHaveLength(2);
    expect(allKeys).toContain('key1');
    expect(allKeys).toContain('key2');
  });
});

// Cross-implementation tests
describe('StorageManager Interface Compliance', () => {
  const implementations = [
    {
      name: 'LocalStorageManager',
      create: () => new LocalStorageManager('test:'),
    },
    {
      name: 'SessionStorageManager',
      create: () => new SessionStorageManager('test:'),
    },
    { name: 'MemoryStorageManager', create: () => new MemoryStorageManager() },
  ];

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: createStorageMock(),
      writable: true,
    });
  });

  implementations.forEach(({ name, create }) => {
    describe(`${name} Interface Compliance`, () => {
      let storage: ReturnType<typeof create>;

      beforeEach(() => {
        storage = create();
      });

      it('should implement all required methods', () => {
        expect(storage.set).toBeDefined();
        expect(storage.get).toBeDefined();
        expect(storage.remove).toBeDefined();
        expect(storage.clear).toBeDefined();
        expect(storage.has).toBeDefined();
        expect(storage.keys).toBeDefined();
      });

      it('should handle complex objects', async () => {
        const complexObject = {
          id: 'CT-2024-001-ABC123',
          nested: {
            array: [1, 2, 3],
            date: new Date(),
            boolean: true,
            null: null,
            undefined: undefined,
          },
        };

        await storage.set('complex', complexObject);
        const retrieved = await storage.get('complex');

        expect(retrieved).toBeDefined();
        expect((retrieved as any).id).toBe(complexObject.id);
        expect((retrieved as any).nested.array).toEqual([1, 2, 3]);
        expect((retrieved as any).nested.boolean).toBe(true);
        expect((retrieved as any).nested.null).toBeNull();
      });
    });
  });
});
