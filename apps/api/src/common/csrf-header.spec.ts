import type { Request, Response } from 'express';
import { csrfHeaderMiddleware } from './csrf-header';

function run(method: string, header?: string): unknown {
  const req = { method, header: () => header } as unknown as Request;
  let result: unknown = 'not-called';
  csrfHeaderMiddleware(req, {} as Response, (error?: unknown) => {
    result = error;
  });
  return result;
}

describe('csrfHeaderMiddleware', () => {
  it('lets safe methods through without the header', () => {
    expect(run('GET')).toBeUndefined();
  });

  it('rejects state-changing requests without the header', () => {
    expect(run('POST')).toBeDefined();
    expect(run('DELETE', 'other')).toBeDefined();
  });

  it('accepts state-changing requests carrying the header', () => {
    expect(run('POST', 'margi-ai')).toBeUndefined();
  });
});
