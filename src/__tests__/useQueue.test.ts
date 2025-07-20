import {jest} from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useQueue } from '../useQueue';
import PQueue from 'p-queue';

describe('useQueue', () => {
  it('should call onLoadingChange', async () => {
    const onLoadingChange = jest.fn();
    
    const queue = renderHook(() => useQueue({
      onLoadingChange
    }));
    await queue.result.current.queue.add(() => {});
    
    expect(onLoadingChange).toHaveBeenCalledWith(true);
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
  });


  it('should call pause and then start on the queue itself when pause is called', async () => {
    const pauseSpy = jest.spyOn(PQueue.prototype, 'pause');
    const startSpy = jest.spyOn(PQueue.prototype, 'start');

    const { result } = renderHook(() => useQueue({
      pauseTime: 0,
      startDenounce: 0,
      pauseDenounce: 0
    }));
    
    result.current.pause();

    expect(pauseSpy).toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start should not be called immediately, but after the pause time
    expect(startSpy).toHaveBeenCalled();
  });

});
