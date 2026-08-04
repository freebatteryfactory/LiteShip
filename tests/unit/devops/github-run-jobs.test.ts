import { describe, expect, it, vi } from 'vitest';
import { fetchCompletedGithubRunJobs } from '../../../scripts/lib/github-run-jobs.js';

function response(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe('GitHub run jobs observation', () => {
  it('uses the exact attempt endpoint and preserves completed skipped jobs with unknown timestamps', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      response({
        total_count: 3,
        jobs: [
          {
            name: 'format',
            status: 'completed',
            conclusion: 'success',
            started_at: '2026-07-24T12:00:00.000Z',
            completed_at: '2026-07-24T12:00:01.000Z',
            run_attempt: 2,
          },
          {
            name: 'admission',
            status: 'in_progress',
            conclusion: null,
            started_at: '2026-07-24T12:00:02.000Z',
            // GitHub's live-run projection has emitted this zero-date sentinel
            // for unfinished jobs. Status owns admission; placeholder clock
            // fields on non-completed jobs must never enter evidence.
            completed_at: '0001-01-01T00:00:00.000Z',
            run_attempt: 2,
          },
          {
            name: 'windows-smoke',
            status: 'completed',
            conclusion: 'skipped',
            // GitHub has emitted contradictory placeholder timing for skipped
            // jobs in production. It is not execution evidence.
            started_at: '2026-07-24T12:00:02.000Z',
            completed_at: '2026-07-24T12:00:01.000Z',
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
      fetchImpl,
    });
    expect(jobs).toEqual([
      {
        name: 'format',
        conclusion: 'success',
        startedAt: '2026-07-24T12:00:00.000Z',
        completedAt: '2026-07-24T12:00:01.000Z',
        runAttempt: 2,
      },
      { name: 'windows-smoke', conclusion: 'skipped', startedAt: null, completedAt: null, runAttempt: 2 },
    ]);
    expect(fetchImpl.mock.calls[0]![0]).toContain('/runs/123/attempts/2/jobs');
  });

  it.each([
    ['success', '2026-07-24T12:00:00.000Z', '2026-07-24T12:00:01.000Z'],
    ['failure', '2026-07-24T12:00:00.000Z', '2026-07-24T12:00:01.000Z'],
    ['cancelled', null, '2026-07-24T12:00:01.000Z'],
    ['stale', null, null],
  ] as const)(
    'admits completed %s observations without inventing missing time',
    async (conclusion, started, completed) => {
      const jobs = await fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '1',
        token: 'token',
        fetchImpl: vi.fn<typeof fetch>(async () =>
          response({
            total_count: 1,
            jobs: [
              {
                name: 'authority',
                status: 'completed',
                conclusion,
                started_at: started,
                completed_at: completed,
                run_attempt: 1,
              },
            ],
          }),
        ),
      });
      expect(jobs[0]).toMatchObject({ conclusion, startedAt: started, completedAt: completed });
    },
  );

  it('rejects a foreign attempt and duplicate completed identity', async () => {
    const job = {
      name: 'format',
      status: 'completed',
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
        fetchImpl: vi.fn<typeof fetch>(async () => response({ total_count: 1, jobs: [job] })),
      }),
    ).rejects.toThrow(/foreign attempt/u);
    await expect(
      fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '1',
        token: 'token',
        fetchImpl: vi.fn<typeof fetch>(async () => response({ total_count: 2, jobs: [job, job] })),
      }),
    ).rejects.toThrow(/duplicate/u);
  });

  it.each([
    ['name', { status: 'completed', conclusion: 'success', started_at: null, completed_at: null, run_attempt: 1 }],
    ['status', { name: 'format', conclusion: 'success', started_at: null, completed_at: null, run_attempt: 1 }],
    ['conclusion', { name: 'format', status: 'completed', started_at: null, completed_at: null, run_attempt: 1 }],
    [
      'run_attempt',
      { name: 'format', status: 'completed', conclusion: 'success', started_at: null, completed_at: null },
    ],
    ['started_at', { name: 'format', status: 'completed', conclusion: 'success', completed_at: null, run_attempt: 1 }],
    ['completed_at', { name: 'format', status: 'completed', conclusion: 'success', started_at: null, run_attempt: 1 }],
  ])('rejects a completed job missing required %s', async (_field, job) => {
    await expect(
      fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '1',
        token: 'token',
        fetchImpl: vi.fn<typeof fetch>(async () => response({ total_count: 1, jobs: [job] })),
      }),
    ).rejects.toThrow(/malformed/u);
  });

  it('rejects impossible completed-before-started timing evidence', async () => {
    await expect(
      fetchCompletedGithubRunJobs({
        repository: 'freebatteryfactory/LiteShip',
        runId: '123',
        runAttempt: '1',
        token: 'token',
        fetchImpl: vi.fn<typeof fetch>(async () =>
          response({
            total_count: 1,
            jobs: [
              {
                name: 'format',
                status: 'completed',
                conclusion: 'success',
                started_at: '2026-07-24T12:00:02.000Z',
                completed_at: '2026-07-24T12:00:01.000Z',
                run_attempt: 1,
              },
            ],
          }),
        ),
      }),
    ).rejects.toThrow(/malformed/u);
  });
});
