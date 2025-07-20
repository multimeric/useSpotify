import { renderHook, act, waitFor } from '@testing-library/react';
import { usePager, Pager } from '../index';
import { SpotifyApiError } from '../validator';
import { useQueue } from '../useQueue';
import { jest } from '@jest/globals';
import PQueue from 'p-queue';

type TestItem = {
  id: string;
  name: string;
  extra?: string;
};

type ProcessedItem = {
  id: string;
  name: string;
};

const mockPager = jest.fn<Pager<TestItem>>(async (offset, pageSize) => ({
  items: Array.from({ length: pageSize }, (_, i) => ({
    id: `${offset + i + 1}`,
    name: `Item ${offset + i + 1}`,
    extra: 'data',
  })),
  total: 100,
  offset,
  pageSize,
  href: "",
  next: "",
  limit: 100,
  previous: ""
})
);

const processFunction = (item: TestItem): ProcessedItem => ({
  id: item.id,
  name: item.name
});

describe('usePager', () => {
  const pauseSpy = jest.spyOn(PQueue.prototype, 'pause');
  const addSpy = jest.spyOn(PQueue.prototype, 'add');

  afterEach(() => {
    // Reset call counters etc
    jest.clearAllMocks();
  })

  it('should process items using custom process function', async () => {

    const { result } = renderHook(() => {
      const queue = useQueue();
      return usePager(mockPager, queue, 50, processFunction)
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(50)
      expect(result.current.items[0]).toHaveProperty('id');
      expect(result.current.items[0]).not.toHaveProperty('data');
    });
  });

  it('should handle rate limiting by pausing queue and re-queuing request', async () => {
    mockPager.mockRejectedValueOnce(new SpotifyApiError('Rate limited', 429));

    renderHook(() => {
      const queue = useQueue();
      usePager(mockPager, queue, 50, processFunction)
    });

    await waitFor(() => {
      // The queue should have been paused when the rate limit error occurred
      expect(pauseSpy).toHaveBeenCalled();
      // The request should have been re-queued
      expect(addSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('should load more pages correctly', async () => {

    const { result } = renderHook(() => {
      const queue = useQueue();
      return usePager(mockPager, queue, 50, processFunction)
    });


    // After the intiail load there should be 50 items
    await waitFor(() => {
      expect(result.current.items).toHaveLength(50);
    });

    await act(async () => {
      // Load more pages
      const newItems = await result.current.loadMore((current, total) => current + 50);
      // 50 items should be resolved
      expect(newItems).toHaveLength(50)
    });

    // The full item set should have 100 items
    await waitFor(() => {
      expect(result.current.items).toHaveLength(100);
    });
  });

});
