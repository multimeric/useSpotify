import PQueue from "p-queue";
import { useDebounceCallback } from 'usehooks-ts'
import { useRef, useEffect } from "react";

export type QueueReturn = {
    queue: PQueue;
    pause: () => void;
    restart: () => void;
}

export type QueueOptions = {
    concurrencyLimit?: number;
    pauseTime?: number;
    pauseDenounce?: number;
    startDenounce?: number;
    onLoadingChange?: (loading: boolean) => void;
}

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
export function useQueue(options: QueueOptions = {}): QueueReturn {
    const { concurrencyLimit = 5, pauseTime = 1000, onLoadingChange, pauseDenounce = 1000, startDenounce = 1000 } = options;
    
    const queue = useRef<PQueue>(new PQueue({ concurrency: concurrencyLimit }));

    useEffect(() => {
        if (concurrencyLimit != queue.current.concurrency) {
            queue.current = new PQueue({ concurrency: concurrencyLimit });
        }
        
        if (onLoadingChange) {
            queue.current.on("add", () => {
                onLoadingChange(true)
        });
            queue.current.on("idle", () => {
                onLoadingChange(false)
        });
        }
    }, [concurrencyLimit, onLoadingChange]);
    // We only want one restart queued at a time
    const restart = useDebounceCallback(() => queue.current.start(), startDenounce, {trailing: true});
    // Multiple pauses in succession will create multiple restarts, so we debounce the pause
    const pause = useDebounceCallback(() => {
        // When a pause is requested, we pause the queue and restart it after a delay
        queue.current.pause()
        setTimeout(restart, pauseTime);
    }, pauseDenounce, {leading: true});

    return {
        queue: queue.current,
        pause,
        restart
    };
}
