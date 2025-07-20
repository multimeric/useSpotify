# usePager Hook

A React hook for efficiently paginating through Spotify API results with built-in rate limiting and queue management.

## Overview

The `usePager` hook provides a clean interface for loading and managing paginated data from the Spotify Web API. It handles rate limiting automatically by pausing and resuming requests when encountering 429 (Too Many Requests) responses.

## Features

- ✅ Automatic pagination management
- ✅ Built-in rate limiting handling
- ✅ Queue-based request processing
- ✅ Memory optimization through item processing
- ✅ TypeScript support with generics
- ✅ Sparse array handling for efficient memory usage

## Basic Usage

```typescript
import { usePager, useQueue } from 'usespotify';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

function PlaylistTracks() {
  const queue = useQueue();
  const api = SpotifyApi.withAccessToken("your-client-id", accessToken);

  // Basic usage - load playlist tracks
  const { items: tracks, loadMore, hasMore } = usePager(
    (offset, pageSize) => api.playlists.getPlaylistItems("playlist-id", "US", undefined, pageSize, offset),
    queue,
    50 // page size
  );

  const handleLoadMore = async () => {
    if (hasMore) {
      await loadMore((current, total) => current + 50);
    }
  };

  return (
    <div>
      <h2>Playlist Tracks ({tracks.length} loaded)</h2>
      {tracks.map((track, index) => (
        <div key={track.track?.id || index}>
          {track.track?.name} - {track.track?.artists?.[0]?.name}
        </div>
      ))}
      {hasMore && (
        <button onClick={handleLoadMore}>
          Load More Tracks
        </button>
      )}
    </div>
  );
}
```

## Advanced Usage with Processing

You can process items as they're loaded to reduce memory usage and transform data:

```typescript
import { usePager, useQueue } from 'usespotify';

// Define input and output types
type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  duration_ms: number;
  preview_url: string | null;
  // ... other properties
};

type SimpleTrack = {
  id: string;
  name: string;
  artist: string;
  duration: number;
};

function OptimizedPlaylist() {
  const queue = useQueue();
  
  // Process function to transform and reduce data
  const processTrack = (item: any, offset: number): SimpleTrack => ({
    id: item.track?.id || `unknown-${offset}`,
    name: item.track?.name || 'Unknown Track',
    artist: item.track?.artists?.[0]?.name || 'Unknown Artist',
    duration: item.track?.duration_ms || 0,
  });

  const { items: tracks, loadMore, hasMore } = usePager(
    (offset, pageSize) => api.playlists.getPlaylistItems("playlist-id", "US", undefined, pageSize, offset),
    queue,
    50,
    processTrack // Transform items as they're loaded
  );

  return (
    <div>
      <h2>Optimized Playlist ({tracks.length} tracks)</h2>
      {tracks.map((track) => (
        <div key={track.id}>
          <strong>{track.name}</strong> by {track.artist}
          <span>({Math.round(track.duration / 1000)}s)</span>
        </div>
      ))}
      {hasMore && (
        <button onClick={() => loadMore((current, total) => total)}>
          Load All Remaining Tracks
        </button>
      )}
    </div>
  );
}
```

## Loading Strategies

The `loadMore` function accepts a callback that determines how many items to load:

```typescript
// Load 50 more items
await loadMore((current, total) => current + 50);

// Load all remaining items
await loadMore((current, total) => total);

// Load to a specific number
await loadMore((current, total) => Math.min(current + 100, total));

// Load in chunks of 25% of total
await loadMore((current, total) => Math.min(current + Math.ceil(total * 0.25), total));
```

## Queue Configuration

Configure the queue for different rate limiting scenarios:

```typescript
function CustomQueueExample() {
  // Configure queue with custom rate limiting
  const queue = useQueue({
    pauseTime: 5000,        // Pause for 5 seconds when rate limited
    startDenounce: 1000,    // Wait 1 second before auto-resuming
    onLoadingChange: (isLoading) => {
      console.log('Queue loading state:', isLoading);
    }
  });

  const { items, loadMore, hasMore } = usePager(
    yourPagerFunction,
    queue,
    25 // Smaller page size for gentler API usage
  );

  // Manual queue control
  const handlePause = () => queue.pause();
  const handleResume = () => queue.restart();

  return (
    <div>
      {/* Your component JSX */}
      <button onClick={handlePause}>Pause Queue</button>
      <button onClick={handleResume}>Resume Queue</button>
    </div>
  );
}
```

## Real-World Examples

### User's Saved Tracks
```typescript
const { items: savedTracks, loadMore, hasMore } = usePager(
  (offset, pageSize) => api.currentUser.tracks.savedTracks(pageSize, offset),
  queue,
  50
);
```

### Artist's Albums
```typescript
const { items: albums, loadMore, hasMore } = usePager(
  (offset, pageSize) => api.artists.albums("artist-id", "album", "US", pageSize, offset),
  queue,
  20
);
```

### Search Results
```typescript
const { items: searchResults, loadMore, hasMore } = usePager(
  (offset, pageSize) => api.search("query", ["track"], "US", pageSize, offset).then(results => ({
    items: results.tracks.items,
    total: results.tracks.total,
    offset: results.tracks.offset,
    // Map other required Page<T> properties
    limit: results.tracks.limit,
    href: results.tracks.href,
    next: results.tracks.next,
    previous: results.tracks.previous
  })),
  queue,
  50
);
```

## API Reference

### `usePager<InputType, OutputType>`

**Parameters:**
- `pager: Pager<InputType> | null` - Function that fetches a page of items
- `queue: QueueReturn` - Queue instance from `useQueue()` for request management
- `pageSize: MaxInt<50>` - Number of items per page (default: 50)
- `process?: (item: InputType, offset: number) => OutputType` - Optional processing function

**Returns:**
- `items: OutputType[]` - Array of all loaded and processed items
- `loadMore: (changeLimit: (current: number, total: number) => number) => Promise<OutputType[]>` - Function to load additional pages
- `hasMore: boolean` - Whether there are more items available to load

### `Pager<T>` Type

```typescript
type Pager<T> = (offset: number, pageSize: MaxInt<50>) => Promise<Page<T>>;
```

A function that fetches a page of items starting at the given offset.

## Error Handling

The hook automatically handles Spotify API rate limiting (HTTP 429) by:

1. Immediately pausing the queue when a rate limit is encountered
2. Re-queuing the failed request
3. Automatically resuming after the configured pause time

For other errors, they will be thrown and should be handled by your error boundary or try-catch blocks.

## Performance Tips

1. **Use processing functions** to reduce memory usage by keeping only needed properties
2. **Choose appropriate page sizes** - larger pages are more efficient but use more memory
3. **Configure queue pause times** based on your app's rate limiting needs
4. **Load data incrementally** rather than loading everything at once for better UX

## TypeScript Support

The hook is fully typed with generics:

```typescript
// InputType is what the API returns, OutputType is what you want to work with
usePager<SpotifyPlaylistTrack, SimpleTrack>(pager, queue, 50, processFunction);
```

This ensures type safety throughout your application while allowing flexible data transformation.
