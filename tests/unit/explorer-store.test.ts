import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { createNormalizedDataset } from '../../src/lib/skills-framework/parser';
import { useExplorerStore } from '../../src/stores/explorer';
import type { DatasetRawData } from '../../src/lib/skills-framework/types';

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

describe('explorer store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps compare selections distinct after analysis', () => {
    const explorerStore = useExplorerStore();
    const dataset = createNormalizedDataset(fixture);

    explorerStore.setSelection([
      'Technology|||Engineering|||Frontend Engineer',
      'Technology|||Engineering|||Staff Frontend Engineer',
    ]);
    explorerStore.runAnalysis(dataset);

    expect(explorerStore.compareSelection.role1).toBe('Technology|||Engineering|||Frontend Engineer');
    expect(explorerStore.compareSelection.role2).toBe('Technology|||Engineering|||Staff Frontend Engineer');

    explorerStore.setCompareSelection(
      'Technology|||Engineering|||Frontend Engineer',
      'Technology|||Engineering|||Frontend Engineer',
    );

    expect(explorerStore.compareSelection.role1).toBe('Technology|||Engineering|||Frontend Engineer');
    expect(explorerStore.compareSelection.role2).toBe('Technology|||Engineering|||Staff Frontend Engineer');
  });
});
