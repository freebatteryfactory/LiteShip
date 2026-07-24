import { describe, expect, it, vi } from 'vitest';
import { fetchCompletedGithubRunJobs } from '../../../scripts/lib/github-run-jobs.js';

function response(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe('GitHub run jobs observation', () => {
  it('uses the exact attempt endpoint and admits only completed jobs', async () => {
    const fetchImpl = vi.fn(async () =>
      response({
        total_count: 2,
        jobs: [
          {
            name: 'format',
            conclusion: 'success',
            started_at: '2026-07-24T12:00:00.000Z',
            completed_at: '2026-07-24T12:00:01.000Z',
            run_attempt: 2,
          },
          {
            name: 'admission',
            conclusion: null,
            started_at: '2026-07-24T12:00:02.000Z',
            completed_at: null,
            run_attempt: 2,
          },
        ],
      }),
    );
    const jobs = await fetchCompletedGithubRunJobs({
      repository: 'freebatteryfactory/LiteShip',
      runId: '123',
      runAttempt: '2',
      token: 'token',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(jobs.map((job) => job.name)).toEqual(['format']);
    expect(fetchImpl.mock.calls[0]![0]).toContain('/runs/123/attempts/2/jobs');
  });

  it('rejects a foreign attempt and duplicate completed identity', async () => {
    const job = {
      name: 'format',
      conclusion: 'success',
      started_at: '2026-07-24T12:00:00.000Z',
      completed_at: '2026-07-24T12:00:01.000Z',
      run_attempt: 1,
    };
    await expect(
      fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '2',
        token: 'token',
        fetchImpl: vi.fn(async () => response({ total_count: 1, jobs: [job] })) as typeof fetch,
      }),
    ).rejects.toThrow(/foreign attempt/u);
    await expect(
      fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '1',
        token: 'token',
        fetchImpl: vi.fn(async () => response({ total_count: 2, jobs: [job, job] })) as typeof fetch,
      }),
    ).rejects.toThrow(/duplicate/u);
  });

  it('rejects impossible completed-before-started timing evidence', async () => {
    await expect(
      fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '1',
        token: 'token',
        fetchImpl: vi.fn(async () =>
          response({
            total_count: 1,
            jobs: [
              {
                name: 'format',
                conclusion: 'success',
                started_at: '2026-07-24T12:00:02.000Z',
                completed_at: '2026-07-24T12:00:01.000Z',
                run_attempt: 1,
              },
            ],
          }),
        ) as typeof fetch,
      }),
    ).rejects.toThrow(/malformed/u);
  });
});
