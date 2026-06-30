import { Scheduler } from 'effect';

const scheduleMicrotask = (task: () => void): (() => void) => {
  let active = true;
  queueMicrotask(() => {
    if (active) {
      task();
    }
  });
  return () => {
    active = false;
  };
};

/** Build a scheduler for directive-owned background Effect fibers. */
export const makeDirectiveScheduler = (): Scheduler.Scheduler =>
  new Scheduler.MixedScheduler('async', scheduleMicrotask);
