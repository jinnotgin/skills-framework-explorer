import { describe, expect, it } from 'vitest';

import { createNormalizedDataset, createPreloadedDatasetJson } from '../../src/lib/skills-framework/parser';
import type { DatasetRawData } from '../../src/lib/skills-framework/types';

const fixture: DatasetRawData = {
  generatedAt: '2026-04-30T10:00:00+08:00',
  jobRoleDescriptions: [
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Frontend Engineer',
      'Job Role Description': 'Builds product interfaces.',
      'Performance Expectation': 'Ships reliable UI.',
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
  ],
  tscToUnique: [
    {
      tsc_code: 'TSC001',
      proficiency_level: '3',
      parent_skill_title: 'Component Architecture',
      parent_skill_description: 'Reusable UI architecture.',
      skill_type: 'Technical',
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

describe('createPreloadedDatasetJson', () => {
  it('exports normalized datasets in the bundled JSON shape', () => {
    const normalized = createNormalizedDataset(fixture);
    const exported = createPreloadedDatasetJson(normalized);

    expect(exported).toEqual(fixture);
    expect(Object.keys(exported ?? {}).sort()).toEqual(
      ['generatedAt', 'jobRoleCwfKt', 'jobRoleDescriptions', 'jobRoleTcsCcs', 'tscKAndA', 'tscToUnique', 'uniqueSkillsList'].sort(),
    );
  });
});
