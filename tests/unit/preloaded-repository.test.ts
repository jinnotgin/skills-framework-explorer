import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRELOADED_DB_NAME, PRELOADED_SCHEMA_VERSION, preloadedDatasetRepository } from '../../src/lib/skills-framework/preloadedRepository';
import type { DatasetRawData } from '../../src/lib/skills-framework/types';

const fixtureV1: DatasetRawData = {
  generatedAt: '2026-03-17T15:11:45+08:00',
  jobRoleDescriptions: [
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Frontend Engineer',
      'Job Role Description': 'Builds product interfaces.',
      'Performance Expectation': 'Ships reliable UI.',
    },
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Staff Frontend Engineer',
      'Job Role Description': 'Leads product interfaces.',
      'Performance Expectation': 'Raises architecture quality.',
    },
  ],
  jobRoleTcsCcs: [
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Frontend Engineer',
      'TSC_CCS Code': 'TSC001',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Staff Frontend Engineer',
      'TSC_CCS Code': 'TSC001',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '5',
    },
  ],
  tscKAndA: [
    {
      Sector: 'Technology',
      'TSC_CCS Code': 'TSC001',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Component Engineering',
      'TSC_CCS Description': 'Build reusable components.',
      'TSC_CCS Category': 'Engineering',
      'Proficiency Level': '3',
      'Proficiency Description': 'Delivers scoped components.',
      'Knowledge / Ability Items': 'Component composition',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Technology',
      'TSC_CCS Code': 'TSC001',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Component Engineering',
      'TSC_CCS Description': 'Build reusable components.',
      'TSC_CCS Category': 'Engineering',
      'Proficiency Level': '5',
      'Proficiency Description': 'Leads shared systems.',
      'Knowledge / Ability Items': 'System design',
      'Knowledge / Ability Classification': 'Ability',
    },
  ],
  tscToUnique: [
    {
      tsc_code: 'TSC001',
      proficiency_level: '3',
      parent_skill_title: 'Component Architecture',
      parent_skill_description: 'Reusable UI architecture.',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
    {
      tsc_code: 'TSC001',
      proficiency_level: '5',
      parent_skill_title: 'Component Architecture',
      parent_skill_description: 'Reusable UI architecture.',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
  ],
  uniqueSkillsList: [
    {
      parent_skill_title: 'Component Architecture',
      parent_skill_description: 'Reusable UI architecture.',
    },
  ],
  jobRoleCwfKt: [],
};

const fixtureV2: DatasetRawData = {
  ...fixtureV1,
  generatedAt: '2026-03-18T09:00:00+08:00',
  jobRoleDescriptions: [
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Senior Frontend Engineer',
      'Job Role Description': 'Builds product interfaces.',
      'Performance Expectation': 'Ships reliable UI.',
    },
    fixtureV1.jobRoleDescriptions[1],
  ],
};

async function createZipBody(rawData: DatasetRawData): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('skills-framework-data(1).json', JSON.stringify(rawData));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return Uint8Array.from(bytes).buffer;
}

function createMetadataResponse(generatedAt: string): Response {
  return {
    ok: true,
    json: async () => ({ generatedAt }),
  } as Response;
}

function createZipResponse(body: ArrayBuffer): Response {
  return {
    ok: true,
    arrayBuffer: async () => body.slice(0),
  } as Response;
}

function countRequests(fetchMock: ReturnType<typeof vi.fn>, suffix: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith(suffix)).length;
}

async function installFetchStub(rawData: DatasetRawData) {
  const zipBody = await createZipBody(rawData);
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('data/skills-framework-data.meta.json')) {
      return createMetadataResponse(rawData.generatedAt ?? '');
    }
    if (url.endsWith('data/skills-framework-data.json.zip')) {
      return createZipResponse(zipBody);
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('preloaded dataset repository', () => {
  beforeEach(async () => {
    await preloadedDatasetRepository.resetForTests();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await preloadedDatasetRepository.resetForTests();
  });

  it('builds the IndexedDB cache on first sync', async () => {
    const fetchMock = await installFetchStub(fixtureV1);

    await preloadedDatasetRepository.syncPreloadedDataset();

    expect(countRequests(fetchMock, 'data/skills-framework-data.meta.json')).toBe(1);
    expect(countRequests(fetchMock, 'data/skills-framework-data.json.zip')).toBe(1);

    const meta = await preloadedDatasetRepository.getDatasetMeta();
    const roles = await preloadedDatasetRepository.getRolesCatalog();
    const skills = await preloadedDatasetRepository.getGlobalSkillsIndex();

    expect(meta).toEqual({
      generatedAt: fixtureV1.generatedAt,
      source: 'indexeddb',
    });
    expect(roles).toHaveLength(2);
    expect(skills[0]?.title).toBe('Component Architecture');
  });

  it('skips the zip download when metadata matches a healthy cache', async () => {
    await installFetchStub(fixtureV1);
    await preloadedDatasetRepository.syncPreloadedDataset();

    const secondFetch = await installFetchStub(fixtureV1);
    await preloadedDatasetRepository.syncPreloadedDataset();

    expect(countRequests(secondFetch, 'data/skills-framework-data.meta.json')).toBe(1);
    expect(countRequests(secondFetch, 'data/skills-framework-data.json.zip')).toBe(0);
  });

  it('rebuilds the cache when generatedAt changes', async () => {
    await installFetchStub(fixtureV1);
    await preloadedDatasetRepository.syncPreloadedDataset();

    const secondFetch = await installFetchStub(fixtureV2);
    await preloadedDatasetRepository.syncPreloadedDataset();

    expect(countRequests(secondFetch, 'data/skills-framework-data.json.zip')).toBe(1);

    const meta = await preloadedDatasetRepository.getDatasetMeta();
    const roles = await preloadedDatasetRepository.getRolesCatalog();
    expect(meta?.generatedAt).toBe(fixtureV2.generatedAt);
    expect(roles[0]?.role).toBe('Senior Frontend Engineer');
  });

  it('rebuilds the cache when a required store is missing data', async () => {
    await installFetchStub(fixtureV1);
    await preloadedDatasetRepository.syncPreloadedDataset();

    const db = new Dexie(PRELOADED_DB_NAME);
    db.version(PRELOADED_SCHEMA_VERSION).stores({
      sfe_meta: 'id, generatedAt',
      sfe_roles: '&roleKey, sector, role, track',
      sfe_role_cwf: '&roleKey',
      sfe_role_analysis: '&roleKey',
      sfe_skill_index: '&skillKey, title',
    });
    await db.open();
    await db.table('sfe_role_analysis').clear();
    db.close();

    const secondFetch = await installFetchStub(fixtureV1);
    await preloadedDatasetRepository.syncPreloadedDataset();

    expect(countRequests(secondFetch, 'data/skills-framework-data.json.zip')).toBe(1);
    const roles = await preloadedDatasetRepository.getRoleAnalyses([
      'Technology|||Engineering|||Frontend Engineer',
      'Technology|||Engineering|||Staff Frontend Engineer',
    ]);
    expect(roles).toHaveLength(2);
  });

  it('falls back to memory mode when IndexedDB is unavailable', async () => {
    const fetchMock = await installFetchStub(fixtureV1);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(preloadedDatasetRepository as any, 'openDatabase').mockRejectedValue(new Error('IndexedDB unavailable'));

    await preloadedDatasetRepository.syncPreloadedDataset();

    expect(countRequests(fetchMock, 'data/skills-framework-data.json.zip')).toBe(1);
    const meta = await preloadedDatasetRepository.getDatasetMeta();
    const roles = await preloadedDatasetRepository.getRolesCatalog();

    expect(meta).toEqual({
      generatedAt: fixtureV1.generatedAt,
      source: 'fallback-memory',
    });
    expect(roles).toHaveLength(2);
  });
});
