import type { QueueReturn } from "./useQueue";
import type { MaxInt, Page } from "@spotify/web-api-ts-sdk";
export type Pager<T> = (offset: number, pageSize: MaxInt<50>) => Promise<Page<T>>;
type UsePagerReturn<OutputType> = {
    items: OutputType[];
    loadMore: (changeLimit: (currentLimit: number, total: number) => number) => Promise<OutputType[]>;
    hasMore: boolean;
};
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
export declare function usePager<InputType, OutputType = InputType>(pager: Pager<InputType> | null, queue: QueueReturn, pageSize?: MaxInt<50>, process?: (item: InputType, offset: number) => OutputType): UsePagerReturn<OutputType>;
export {};
