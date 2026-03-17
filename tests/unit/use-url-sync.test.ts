// @vitest-environment jsdom

import { defineComponent, h, nextTick } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useUrlSync } from '../../src/composables/useUrlSync';
import { createNormalizedDataset } from '../../src/lib/skills-framework/parser';
import type { DatasetRawData } from '../../src/lib/skills-framework/types';
import { useDatasetStore } from '../../src/stores/dataset';
import { useExplorerStore } from '../../src/stores/explorer';

const fixture: DatasetRawData = {
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

const roleKeys = [
  'Technology|||Engineering|||Frontend Engineer',
  'Technology|||Engineering|||Staff Frontend Engineer',
];

const SyncHarness = defineComponent({
  name: 'SyncHarness',
  setup() {
    useUrlSync();
    return () => h('div');
  },
});

async function mountHarness(initialPath: string) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: 'roles', path: '/roles', component: SyncHarness },
      { name: 'compare', path: '/compare', component: SyncHarness },
      { name: 'skills', path: '/skills', component: SyncHarness },
    ],
  });

  await router.push(initialPath);

  const wrapper = mount(SyncHarness, {
    global: {
      plugins: [pinia, router],
    },
  });
  await router.isReady();

  return { wrapper, router };
}

async function settle() {
  await flushPromises();
  await nextTick();
  await flushPromises();
}

describe('useUrlSync', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('hydrates compare view params on initial load', async () => {
    const { wrapper } = await mountHarness(
      `/compare?roles=${encodeURIComponent(roleKeys[0])}&roles=${encodeURIComponent(roleKeys[1])}&role1=${encodeURIComponent(roleKeys[1])}&role2=${encodeURIComponent(roleKeys[0])}&filter=diff&details=1`,
    );

    const datasetStore = useDatasetStore();
    const explorerStore = useExplorerStore();
    datasetStore.setDataset(createNormalizedDataset(fixture), 'upload');

    await settle();

    expect(explorerStore.analysisResults?.roleKeys).toEqual(roleKeys);
    expect(explorerStore.compareSelection).toEqual({
      role1: roleKeys[1],
      role2: roleKeys[0],
    });
    expect(explorerStore.compareFilter).toBe('diff');
    expect(explorerStore.compareShowDescriptions).toBe(true);

    wrapper.unmount();
  });

  it('derives compare analysis roles from role1 and role2 when roles are absent', async () => {
    const { wrapper } = await mountHarness(
      `/compare?role1=${encodeURIComponent(roleKeys[1])}&role2=${encodeURIComponent(roleKeys[0])}&filter=diff&details=1`,
    );

    const datasetStore = useDatasetStore();
    const explorerStore = useExplorerStore();
    datasetStore.setDataset(createNormalizedDataset(fixture), 'upload');

    await settle();

    expect(explorerStore.analysisResults?.roleKeys).toEqual([roleKeys[1], roleKeys[0]]);
    expect(explorerStore.compareSelection).toEqual({
      role1: roleKeys[1],
      role2: roleKeys[0],
    });
    expect(explorerStore.compareFilter).toBe('diff');
    expect(explorerStore.compareShowDescriptions).toBe(true);

    wrapper.unmount();
  });

  it('hydrates skills detail params on initial load', async () => {
    const { wrapper } = await mountHarness(
      `/skills?roles=${encodeURIComponent(roleKeys[0])}&skill=${encodeURIComponent('Component Architecture')}&role=${encodeURIComponent(roleKeys[0])}&q=${encodeURIComponent('component')}`,
    );

    const datasetStore = useDatasetStore();
    const explorerStore = useExplorerStore();
    datasetStore.setDataset(createNormalizedDataset(fixture), 'upload');

    await settle();

    expect(explorerStore.analysisResults?.roleKeys).toEqual([roleKeys[0]]);
    expect(explorerStore.skillSearchQuery).toBe('component');
    expect(explorerStore.detail.open).toBe(true);
    expect(explorerStore.detail.kind).toBe('skill-centric');
    expect(explorerStore.detail.skillTitle).toBe('Component Architecture');
    expect(explorerStore.detail.focusedRoleKey).toBe(roleKeys[0]);

    wrapper.unmount();
  });

  it('opens global skills detail from URL without roles selection', async () => {
    const { wrapper } = await mountHarness(
      `/skills?skill=${encodeURIComponent('Component Architecture')}&role=${encodeURIComponent(roleKeys[0])}&q=${encodeURIComponent('component')}`,
    );

    const datasetStore = useDatasetStore();
    const explorerStore = useExplorerStore();
    datasetStore.setDataset(createNormalizedDataset(fixture), 'upload');

    await settle();

    expect(explorerStore.analysisResults?.roleKeys).toEqual([roleKeys[0]]);
    expect(explorerStore.skillSearchQuery).toBe('component');
    expect(explorerStore.detail.open).toBe(true);
    expect(explorerStore.detail.kind).toBe('skill-centric');
    expect(explorerStore.detail.skillTitle).toBe('Component Architecture');
    expect(explorerStore.detail.focusedRoleKey).toBe(roleKeys[0]);

    wrapper.unmount();
  });
});
