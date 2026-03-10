import { describe, expect, it } from 'vitest';

import { buildAnalysis, buildCompareRows } from '../../src/lib/skills-framework/analysis';
import { createNormalizedDataset } from '../../src/lib/skills-framework/parser';
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
      'Job Role Description': 'Leads complex frontend systems.',
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
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Staff Frontend Engineer',
      'TSC_CCS Code': 'TSC002',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '4',
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
      'Proficiency Description': 'Leads shared component systems.',
      'Knowledge / Ability Items': 'System design',
      'Knowledge / Ability Classification': 'Ability',
    },
    {
      Sector: 'Technology',
      'TSC_CCS Code': 'TSC002',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Design Systems',
      'TSC_CCS Description': 'Maintains tokens and visual language.',
      'TSC_CCS Category': 'Design',
      'Proficiency Level': '4',
      'Proficiency Description': 'Maintains the design system.',
      'Knowledge / Ability Items': 'Token architecture',
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
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
    {
      tsc_code: 'TSC001',
      proficiency_level: '5',
      parent_skill_title: 'Component Architecture',
      parent_skill_description: 'Reusable UI architecture.',
      skill_type: 'Technical',
      'Emerging Skills': 'yes',
      'CASL Skills': 'yes',
    },
    {
      tsc_code: 'TSC002',
      proficiency_level: '4',
      parent_skill_title: 'Design Systems',
      parent_skill_description: 'Scalable interface systems.',
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
    {
      parent_skill_title: 'Design Systems',
      parent_skill_description: 'Scalable interface systems.',
    },
  ],
  jobRoleCwfKt: [
    {
      Sector: 'Technology',
      Track: 'Engineering',
      'Job Role': 'Frontend Engineer',
      'Critical Work Function': 'Build interfaces',
      'Key Tasks': 'Implement UI features',
    },
  ],
};

describe('skills framework analysis', () => {
  it('normalizes the dataset and exposes sector and role metadata', () => {
    const dataset = createNormalizedDataset(fixture);

    expect(dataset).not.toBeNull();
    expect(dataset?.roles).toHaveLength(2);
    expect(dataset?.sectors).toEqual(['Technology']);
    expect(dataset?.roleByKey['Technology|||Engineering|||Frontend Engineer']?.role).toBe('Frontend Engineer');
    expect(dataset?.roleCwfByKey['Technology|||Engineering|||Frontend Engineer'][0]?.tasks).toEqual(['Implement UI features']);
  });

  it('builds role and global skill analysis from selected roles', () => {
    const dataset = createNormalizedDataset(fixture);
    const results = buildAnalysis(dataset, [
      'Technology|||Engineering|||Frontend Engineer',
      'Technology|||Engineering|||Staff Frontend Engineer',
    ]);

    expect(results).not.toBeNull();
    expect(results?.totalUniqueSkills).toBe(2);
    expect(results?.roles['Technology|||Engineering|||Frontend Engineer']?.uniqueSkills[0]?.title).toBe('Component Architecture');
    expect(results?.uniqueSkills['Component Architecture']?.roles).toHaveLength(2);
    expect(results?.uniqueSkills['Component Architecture']?.proficiencyLevels).toEqual(['3', '5']);
  });

  it('derives compare rows that preserve proficiency differences', () => {
    const dataset = createNormalizedDataset(fixture);
    const results = buildAnalysis(dataset, [
      'Technology|||Engineering|||Frontend Engineer',
      'Technology|||Engineering|||Staff Frontend Engineer',
    ]);

    const rows = buildCompareRows(
      results,
      'Technology|||Engineering|||Frontend Engineer',
      'Technology|||Engineering|||Staff Frontend Engineer',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.title).toBe('Component Architecture');
    expect(rows[0]?.prof1).toEqual([3]);
    expect(rows[0]?.prof2).toEqual([5]);
  });
});
