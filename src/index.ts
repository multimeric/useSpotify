import { useEffect, useRef, useState } from "react";
import { SpotifyApiError } from "./validator";
import type { QueueReturn } from "./useQueue";
import type { MaxInt, Page } from "@spotify/web-api-ts-sdk";


export type Pager<T> = (offset: number, pageSize: MaxInt<50>) => Promise<Page<T>>;

type UsePagerReturn<OutputType> = {
    // All results we have processed so far
    items: OutputType[];
    // Function to load more pages, which returns a promise that resolves to the new items
    loadMore: (changeLimit: (currentLimit: number, total: number) => number) => Promise<OutputType[]>;
    // Whether there are more items to load
    hasMore: boolean;
}

/**
 * 
 * Hook to manage pagination of Spotify tracks.
 * @template InputType Type of the items returned by the pager function
 * @template OutputType Type of the processed items, defaults to SimpleTrack
 * @param pager Function to retrieve a page of items
 * @param queue Queue that will process the requests
 * @param pageSize Number of items per page, defaults to 50
 * @param process Function to process each item, for example stripping off properties that aren't needed to reduce the memory footprint
 * @returns A UsePagerReturn object.
*/
export function usePager<InputType, OutputType = InputType>(
    pager: Pager<InputType> | null,
    queue: QueueReturn,
    pageSize: MaxInt<50> = 50,
    process: (item: InputType, offset: number) => OutputType = (item, offset) => item as unknown as OutputType,
): UsePagerReturn<OutputType> {
    const maxRequested = useRef<number>(0);
    // Total number of tracks available
    const [total, setTotal] = useState(Infinity);
    // Sparse array of all tracks we have
    const [processed, setProcessed] = useState<OutputType[]>([]);

    /**
     * Splice new tracks into the existing tracks array at the specified index.
     */
    function insertTracks(newTracks: OutputType[], offset: number) {
        setProcessed(tracks => {
            tracks.splice(offset, newTracks.length, ...newTracks);
            return [...tracks];
        })
    }

    /**
     * Requests a page of items from the pager function, processes them, and updates the state.
     * 
     * @param offset 
     */
    async function requestPage(offset: number): Promise<OutputType[]> {
        try {
            const result = await pager(offset, pageSize);
            setTotal(result.total);
            const processed = result.items.map(item => process(item, offset));
            insertTracks(processed, offset);
            if (offset + pageSize > maxRequested.current)
                // Update the max requested if this page goes beyond the current max
                maxRequested.current = offset + pageSize;
            return processed;
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
    useEffect(() => { requestPage(0) }, [])

    /**
     * Updates the page limit to load more pages.
     * @param calculateLimit Function to calculate the number of items to load based on the current limit and available number of items.
     * This allows you to, for example, request all pages by returning the `total`, to request 50 more items by returning `currentLimit + 50`, or request a specific number of items.
     * @returns A promise that resolves to the new tracks loaded.
     */
    async function loadMorePages(calculateLimit: (currentLimit: number, total: number) => number): Promise<OutputType[]> {
        // See https://github.com/spotify/spotify-web-api-ts-sdk/issues/125
        // We need to ensure the first page is loaded before we can load more pages
        if (maxRequested.current === 0) return [];
        if (!pager) return [];
        if (queue.queue.pending > 0 || queue.queue.size > 0){
            // If the queue is already processing or has items, we don't need to load more pages
            // Wait for the queue to finish processing before returning
            await queue.queue.onIdle();
            return [];
        }

        const requestLimit = calculateLimit(maxRequested.current, total);

        const promises: Promise<OutputType[]>[] = [];
        for (let i = maxRequested.current; i < requestLimit; i+=pageSize) {
            // Offset is block scoped, so it's stable in async calls
            const offset = maxRequested.current;
            promises.push(queue.queue.add(async () => {
                const result = await requestPage(offset);
                return result;
            }));
        }

        // Wait until all pages are loaded, then return the new tracks
        const newTracks: OutputType[] = [];
        for (const result of await Promise.all(promises)) {
            newTracks.push(...result);
        }
        return newTracks;
    }

    // Convert the cached tracks to a dense array, removing any undefined entries
    const denseTracks = processed.filter(track => track !== undefined);

    // return [denseTracks, loadMorePages, maxRequested.current < total];
    return {
        items: denseTracks,
        loadMore: loadMorePages,
        hasMore: maxRequested.current < total
    }
}