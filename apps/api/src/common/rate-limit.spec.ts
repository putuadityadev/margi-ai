import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows the limit then rejects until the window passes', () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.take('a', 0);
    limiter.take('a', 10);
    expect(() => limiter.take('a', 20)).toThrow();
    expect(() => limiter.take('b', 20)).not.toThrow();
    expect(() => limiter.take('a', 1500)).not.toThrow();
  });
});
