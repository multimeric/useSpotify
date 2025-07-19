import { MaxInt, Page, Track } from "@spotify/web-api-ts-sdk";
import { convertTrack, SimpleTrack, Source } from "./simpleTrack";
import PQueue from 'p-queue';
import pThrottle from 'p-throttle';
import { useEffect, useRef, useState } from "react";
import { SpotifyApiError } from "./validator";
import { QueueReturn, useQueue } from "./useQueue";

export function processPage(tracks: Track[], source: Source, offset: number): SimpleTrack[] {
    return tracks.map((track, i) => convertTrack(track, source, offset + i));
}

export type Pager<T> = (offset: number, pageSize: MaxInt<50>) => Promise<Page<T>>;
type OnPage = (items: SimpleTrack[]) => void


/**
 * Retrieves all pages of results, with sensible concurrency and retries
 * @param pager Function to retrieve a page of items
 * @param concurrencyLimit Maximum number of concurrent requests to the pager function
 * @param pageSize Number of items per page
 * @param onPage Callback to process each page of items
 */
// export async function getAllPages(
//     pager: Pager,
//     onPage: OnPage,
//     source: Source,
//     pageSize: MaxInt<50> = 50,
//     concurrencyLimit: number = 5
// ): Promise<void> {
//     const queue = new PQueue({ concurrency: concurrencyLimit });
//     // Wait for the first page, since we need to know the total number of items
//     const firstPage = await pager(0, pageSize);
//     onPage(processPage(firstPage.items, source, 0));

//     for (let i = pageSize; i < firstPage.total; i += pageSize) {
//         queue.add(() => requestPage(pager, i, source, pageSize, queue));
//     }
// }

type UsePagerReturn<T> = {
    tracks: SimpleTrack[];
    loadMore: (changeLimit: (currentLimit: number, total: number) => number) => Promise<SimpleTrack[]>;
    hasMore: boolean;
    isLoading: boolean;
}

/**
 * 
 * Hook to manage pagination of Spotify tracks.
 * @template T Type of the items returned by the pager function
 * @template U Type of the processed items, defaults to SimpleTrack
 * @param pager Function to retrieve a page of items
 * @param source Source of the tracks, e.g. LongTerm, ShortTerm, etc
 * @param pageSize Number of items per page, defaults to 50
 * @param concurrencyLimit Maximum number of concurrent requests to the pager function, defaults to 5
 * @returns A tuple containing:
 * - tracks: An array of SimpleTrack objects representing the tracks
 * - loadMore: A function to load more pages, which returns a promise that resolves to the new tracks
 * - hasMore: A boolean indicating if there are more tracks to load
 * - isLoading: A boolean indicating if the queue is currently processing or has items
*/
export function usePager<T, U = T>(
    pager: Pager<T> | null,
    queue: QueueReturn,
    pageSize: MaxInt<50> = 50,
    process: (item: T, offset: number) => U = (item, offset) => item,
): UsePagerReturn<U> {
    // The maximum track number to load.
    // If this is higher than maxRequested, we will load more pages
    const [limit, setLimit] = useState<number>(0);
    const maxRequested = useRef<number>(0);
    // Total number of tracks available
    const [total, setTotal] = useState(Infinity);
    // Sparse array of all tracks we have
    const [processed, setProcessed] = useState<U[]>([]);

    async function requestPage(offset: number): Promise<Page<T>> {
        try {
            const result = await pager(offset, pageSize);
            return result;
        }
        catch (error) {
            if (error instanceof SpotifyApiError && error.statusCode === 429) {
                // When we hit a rate limit, pause immediately
                queue.pause();
                // Re-queue the request (although it won't run immediately)
                return queue.queue.add(() => requestPage(offset));
            }
            throw error;
        }
    }

    // We need to request the first page to know the total number of items
    async function getFirstPage() {
        if (!pager) return;
        // Wait for the first page, since we need to know the total number of items
        const firstPage = await requestPage(0);
        const processed = firstPage.items.map(item => process(item, 0));
        insertTracks(processed, 0);
        setTotal(firstPage.total);
        maxRequested.current += pageSize;
    }
    useEffect(() => { getFirstPage() }, [])

    /**
     * Splice new tracks into the existing tracks array at the specified index.
     */
    function insertTracks(newTracks: U[], offset: number) {
        setProcessed(tracks => {
            tracks.splice(offset, newTracks.length, ...newTracks);
            return [...tracks];
        })
    }

    // Load pages up to the limit, whenever the limit changes
    useEffect(() => {
        if (!pager || limit === 0) return;
        if (maxRequested.current >= limit) return;

        for (let i = maxRequested.current; i < limit; i += pageSize) {
            queue.queue.add(() => requestPage(i));
        }
    }, [pager, limit])

    // /**
    //  * Updates the page limit to load more pages.
    //  * @param pages Number of pages to load
    //  * @returns A promise that resolves to the new tracks loaded.
    //  */
    // async function loadMorePages(pages: number): Promise<SimpleTrack[]> {
    //     // See https://github.com/spotify/spotify-web-api-ts-sdk/issues/125
    //     // We need to ensure the first page is loaded before we can load more pages
    //     if (maxRequested.current === 0) return [];
    //     if (!pager) return [];
    //     if (queue.current.pending > 0 || queue.current.size > 0){
    //         // If the queue is already processing or has items, we don't need to load more pages
    //         // Wait for the queue to finish processing before returning
    //         await queue.current.onIdle();
    //         return [];
    //     }

    //     const promises: Promise<SimpleTrack[]>[] = [];
    //     // setMaxRequested(maxRequested + pages * pageSize);
    //     for (let i = 0; i < pages; i++) {
    //         // Offset is block scoped, so it's stable in async calls
    //         const offset = maxRequested.current;
    //         if (offset >= total)
    //             break
    //         promises.push(queue.current.add(async () => {
    //             const result = await requestPage(pager, offset, source, pageSize, queue.current);
    //             // Add to the master list of tracks as soon as we get the result
    //             insertTracks(result);
    //             return result;
    //         }, {
    //             throwOnTimeout: true,
    //         }));
    //         maxRequested.current += pageSize;
    //     }

    //     // Wait until all pages are loaded, then return the new tracks
    //     const newTracks: SimpleTrack[] = [];
    //     for (const result of await Promise.all(promises)) {
    //         newTracks.push(...result);
    //     }
    //     return newTracks;
    // }

    // Convert the cached tracks to a dense array, removing any undefined entries
    const denseTracks = processed.filter(track => track !== undefined);

    // Flexible function to allow the user to load more pages
    function loadMorePages(changeLimit: (currentLimit: number, total: number) => number): void {
        setLimit(limit => changeLimit(limit, total));
    }

    // return [denseTracks, loadMorePages, maxRequested.current < total];
    return {
        tracks: denseTracks,
        loadMore: loadMorePages,
        hasMore: maxRequested.current < total
    }
}