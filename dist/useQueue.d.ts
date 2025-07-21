import PQueue from "p-queue";
export type QueueReturn = {
    queue: PQueue;
    pause: () => void;
    restart: () => void;
};
export type QueueOptions = {
    concurrencyLimit?: number;
    pauseTime?: number;
    pauseDenounce?: number;
    startDenounce?: number;
    onLoadingChange?: (loading: boolean) => void;
};
/**
 * Hook to create a queue with a specified concurrency limit and pause functionality.
 * @param options Configuration options for the queue
 * @param options.concurrencyLimit Maximum number of concurrent tasks in the queue (default: 5)
 * @param options.pauseTime Time in milliseconds to wait before restarting the queue after a pause (default: 1000)
 * @param options.onLoadingChange Optional callback to handle loading state changes. For example, you can use it to show a loading spinner when the queue is processing tasks.
 * @param options.pauseDenounce Time in milliseconds to debounce the pause function (default: 1000)
 * @param options.startDenounce Time in milliseconds to debounce the restart function (default: 1000)
 * @returns A tuple containing the queue, a function to pause the queue, and a function to restart the queue.
 */
export declare function useQueue(options?: QueueOptions): QueueReturn;
