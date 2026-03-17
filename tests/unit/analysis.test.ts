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

const duplicateTitleFixture: DatasetRawData = {
  jobRoleDescriptions: [
    {
      Sector: 'Consulting',
      Track: 'Advisory',
      'Job Role': 'Transformation Analyst',
      'Job Role Description': 'Supports change initiatives.',
      'Performance Expectation': 'Delivers scoped improvements.',
    },
    {
      Sector: 'Finance',
      Track: 'Operations',
      'Job Role': 'Operations Manager',
      'Job Role Description': 'Runs operational change programmes.',
      'Performance Expectation': 'Keeps processes stable.',
    },
    {
      Sector: 'Retail',
      Track: 'Operations',
      'Job Role': 'Programme Manager',
      'Job Role Description': 'Leads transformation programmes.',
      'Performance Expectation': 'Coordinates change delivery.',
    },
  ],
  jobRoleTcsCcs: [
    {
      Sector: 'Consulting',
      Track: 'Advisory',
      'Job Role': 'Transformation Analyst',
      'TSC_CCS Code': 'TSC100',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
    {
      Sector: 'Finance',
      Track: 'Operations',
      'Job Role': 'Operations Manager',
      'TSC_CCS Code': 'TSC200',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
    {
      Sector: 'Retail',
      Track: 'Operations',
      'Job Role': 'Programme Manager',
      'TSC_CCS Code': 'TSC300',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
  ],
  tscKAndA: [
    {
      Sector: 'Consulting',
      'TSC_CCS Code': 'TSC100',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Change Delivery',
      'TSC_CCS Description': 'Implements change in operations.',
      'TSC_CCS Category': 'Transformation',
      'Proficiency Level': '3',
      'Proficiency Description': 'Supports implementation of change initiatives.',
      'Knowledge / Ability Items': 'Change planning',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Consulting',
      'TSC_CCS Code': 'TSC100',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Change Delivery',
      'TSC_CCS Description': 'Implements change in operations.',
      'TSC_CCS Category': 'Transformation',
      'Proficiency Level': '3',
      'Proficiency Description': 'Supports implementation of change initiatives.',
      'Knowledge / Ability Items': 'Stakeholder communication',
      'Knowledge / Ability Classification': 'Ability',
    },
    {
      Sector: 'Finance',
      'TSC_CCS Code': 'TSC200',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Change Governance',
      'TSC_CCS Description': 'Defines governance for change in regulated teams.',
      'TSC_CCS Category': 'Governance',
      'Proficiency Level': '3',
      'Proficiency Description': 'Defines operating controls for change initiatives.',
      'Knowledge / Ability Items': 'Control frameworks',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Retail',
      'TSC_CCS Code': 'TSC300',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Change Delivery',
      'TSC_CCS Description': 'Implements change in operations.',
      'TSC_CCS Category': 'Transformation',
      'Proficiency Level': '3',
      'Proficiency Description': 'Supports implementation of change initiatives.',
      'Knowledge / Ability Items': 'Change planning',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Retail',
      'TSC_CCS Code': 'TSC300',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Change Delivery',
      'TSC_CCS Description': 'Implements change in operations.',
      'TSC_CCS Category': 'Transformation',
      'Proficiency Level': '3',
      'Proficiency Description': 'Supports implementation of change initiatives.',
      'Knowledge / Ability Items': 'Stakeholder communication',
      'Knowledge / Ability Classification': 'Ability',
    },
  ],
  tscToUnique: [
    {
      sector_title: 'Consulting',
      tsc_code: 'TSC100',
      proficiency_level: '3',
      parent_skill_title: 'Change Management',
      parent_skill_description: 'Implements business change.',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
    {
      sector_title: 'Finance',
      tsc_code: 'TSC200',
      proficiency_level: '3',
      parent_skill_title: 'Change Management',
      parent_skill_description: 'Implements business change.',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
    {
      sector_title: 'Retail',
      tsc_code: 'TSC300',
      proficiency_level: '3',
      parent_skill_title: 'Change Management',
      parent_skill_description: 'Implements business change.',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
  ],
  uniqueSkillsList: [
    {
      parent_skill_title: 'Change Management',
      parent_skill_description: 'Implements business change.',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
  ],
  jobRoleCwfKt: [],
};

const familyCollapseFixture: DatasetRawData = {
  jobRoleDescriptions: [
    {
      Sector: 'Public Transport',
      Track: 'Rail Systems Maintenance',
      'Job Role': 'Engineer',
      'Job Role Description': 'Maintains rail power systems.',
      'Performance Expectation': 'Keeps rail systems available.',
    },
  ],
  jobRoleTcsCcs: [
    {
      Sector: 'Public Transport',
      Track: 'Rail Systems Maintenance',
      'Job Role': 'Engineer',
      'TSC_CCS Code': 'PTP-RSM-1047-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '1',
    },
    {
      Sector: 'Public Transport',
      Track: 'Rail Systems Maintenance',
      'Job Role': 'Engineer',
      'TSC_CCS Code': 'PTP-RSM-2047-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '2',
    },
    {
      Sector: 'Public Transport',
      Track: 'Rail Systems Maintenance',
      'Job Role': 'Engineer',
      'TSC_CCS Code': 'PTP-RSM-3047-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
    {
      Sector: 'Public Transport',
      Track: 'Rail Systems Maintenance',
      'Job Role': 'Engineer',
      'TSC_CCS Code': 'PTP-RSM-4047-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '4',
    },
  ],
  tscKAndA: [
    {
      Sector: 'Public Transport',
      'TSC_CCS Code': 'PTP-RSM-1047-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': '22KV Switchgear Systems Maintenance',
      'TSC_CCS Description': 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      'TSC_CCS Category': 'Rail Systems Maintenance',
      'Proficiency Level': '1',
      'Proficiency Description': 'Carry out scheduled preventive maintenance on low voltage switchboard',
      'Knowledge / Ability Items': 'Types and functions of 22KV Switchgear systems and equipment',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Public Transport',
      'TSC_CCS Code': 'PTP-RSM-2047-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': '22KV Switchgear Systems Maintenance',
      'TSC_CCS Description': 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      'TSC_CCS Category': 'Rail Systems Maintenance',
      'Proficiency Level': '2',
      'Proficiency Description': 'Conduct corrective maintenance on 22kV switchgear system',
      'Knowledge / Ability Items': 'Types of tools and equipment for carrying out corrective maintenance on 22KV switchgear systems',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Public Transport',
      'TSC_CCS Code': 'PTP-RSM-3047-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': '22KV Switchgear Systems Maintenance',
      'TSC_CCS Description': 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      'TSC_CCS Category': 'Rail Systems Maintenance',
      'Proficiency Level': '3',
      'Proficiency Description': 'Troubleshoot faulty 22kV switchgear systems and perform rectification work',
      'Knowledge / Ability Items': 'Methods of locating and rectifying faults',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Public Transport',
      'TSC_CCS Code': 'PTP-RSM-4047-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': '22KV Switchgear Systems Maintenance',
      'TSC_CCS Description': 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      'TSC_CCS Category': 'Rail Systems Maintenance',
      'Proficiency Level': '4',
      'Proficiency Description': 'Diagnose root causes of 22kV switchgear systems failure and review maintenance plans to prevent fault recurrence',
      'Knowledge / Ability Items': 'Failure investigation and prevention methods',
      'Knowledge / Ability Classification': 'Knowledge',
    },
  ],
  tscToUnique: [
    {
      sector_title: 'Public Transport',
      skill_11k_title: '22KV Switchgear Systems Maintenance',
      tsc_code: 'PTP-RSM-1047-1.1',
      proficiency_level: '1',
      parent_skill_title: '22KV Switchgear Systems Maintenance',
      parent_skill_description: 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
    {
      sector_title: 'Public Transport',
      skill_11k_title: '22KV Switchgear Systems Maintenance',
      tsc_code: 'PTP-RSM-2047-1.1',
      proficiency_level: '2',
      parent_skill_title: '22KV Switchgear Systems Maintenance',
      parent_skill_description: 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
    {
      sector_title: 'Public Transport',
      skill_11k_title: '22KV Switchgear Systems Maintenance',
      tsc_code: 'PTP-RSM-3047-1.1',
      proficiency_level: '3',
      parent_skill_title: '22KV Switchgear Systems Maintenance',
      parent_skill_description: 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
    {
      sector_title: 'Public Transport',
      skill_11k_title: '22KV Switchgear Systems Maintenance',
      tsc_code: 'PTP-RSM-4047-1.1',
      proficiency_level: '4',
      parent_skill_title: '22KV Switchgear Systems Maintenance',
      parent_skill_description: 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
  ],
  uniqueSkillsList: [
    {
      parent_skill_title: '22KV Switchgear Systems Maintenance',
      parent_skill_description: 'Implement preventive and corrective maintenance activities of 22KV switchgear systems',
      skill_type: 'Technical',
      'Emerging Skills': '',
      'CASL Skills': '',
    },
  ],
  jobRoleCwfKt: [],
};

const combinedFamilyFixture: DatasetRawData = {
  jobRoleDescriptions: [
    {
      Sector: 'Accountancy',
      Track: 'Business Management',
      'Job Role': 'Audit Manager',
      'Job Role Description': 'Leads business innovation programmes.',
      'Performance Expectation': 'Drives transformation outcomes.',
    },
    {
      Sector: 'Trade Associations and Chambers',
      Track: 'Business Management',
      'Job Role': 'Capability Building Manager',
      'Job Role Description': 'Improves business operations.',
      'Performance Expectation': 'Leads business change.',
    },
  ],
  jobRoleTcsCcs: [
    {
      Sector: 'Accountancy',
      Track: 'Business Management',
      'Job Role': 'Audit Manager',
      'TSC_CCS Code': 'ACC-BTF-3001-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
    {
      Sector: 'Accountancy',
      Track: 'Business Management',
      'Job Role': 'Audit Manager',
      'TSC_CCS Code': 'ACC-BTF-4001-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '4',
    },
    {
      Sector: 'Accountancy',
      Track: 'Business Management',
      'Job Role': 'Audit Manager',
      'TSC_CCS Code': 'ACC-BTF-5001-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '5',
    },
    {
      Sector: 'Trade Associations and Chambers',
      Track: 'Business Management',
      'Job Role': 'Capability Building Manager',
      'TSC_CCS Code': 'TAC-BTF-3001-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '3',
    },
    {
      Sector: 'Trade Associations and Chambers',
      Track: 'Business Management',
      'Job Role': 'Capability Building Manager',
      'TSC_CCS Code': 'TAC-BTF-4001-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '4',
    },
    {
      Sector: 'Trade Associations and Chambers',
      Track: 'Business Management',
      'Job Role': 'Capability Building Manager',
      'TSC_CCS Code': 'TAC-BTF-5001-1.1',
      'TSC_CCS Type': 'TSC',
      'Proficiency Level': '5',
    },
  ],
  tscKAndA: [
    {
      Sector: 'Accountancy',
      'TSC_CCS Code': 'ACC-BTF-3001-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Business Innovation and Improvement',
      'TSC_CCS Description': 'Transform businesses through innovation and embrace changes to drive improvements',
      'TSC_CCS Category': 'Business Management',
      'Proficiency Level': '3',
      'Proficiency Description': 'Support business innovation and improvement activities',
      'Knowledge / Ability Items': 'Improvement models',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Accountancy',
      'TSC_CCS Code': 'ACC-BTF-4001-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Business Innovation and Improvement',
      'TSC_CCS Description': 'Transform businesses through innovation and embrace changes to drive improvements',
      'TSC_CCS Category': 'Business Management',
      'Proficiency Level': '4',
      'Proficiency Description': 'Evaluate new ways to transform and grow business',
      'Knowledge / Ability Items': 'Design frameworks and models',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Accountancy',
      'TSC_CCS Code': 'ACC-BTF-5001-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Business Innovation and Improvement',
      'TSC_CCS Description': 'Transform businesses through innovation and embrace changes to drive improvements',
      'TSC_CCS Category': 'Business Management',
      'Proficiency Level': '5',
      'Proficiency Description': 'Drive business innovation strategy',
      'Knowledge / Ability Items': 'Innovation portfolio planning',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Trade Associations and Chambers',
      'TSC_CCS Code': 'TAC-BTF-3001-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Business Innovation and Improvement',
      'TSC_CCS Description': 'Transform businesses through innovation and embrace changes to drive improvements',
      'TSC_CCS Category': 'Business Management',
      'Proficiency Level': '3',
      'Proficiency Description': 'Support business innovation and improvement activities',
      'Knowledge / Ability Items': 'Improvement models',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Trade Associations and Chambers',
      'TSC_CCS Code': 'TAC-BTF-4001-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Business Innovation and Improvement',
      'TSC_CCS Description': 'Transform businesses through innovation and embrace changes to drive improvements',
      'TSC_CCS Category': 'Business Management',
      'Proficiency Level': '4',
      'Proficiency Description': 'Evaluate new ways to transform and grow business',
      'Knowledge / Ability Items': 'Design frameworks and models',
      'Knowledge / Ability Classification': 'Knowledge',
    },
    {
      Sector: 'Trade Associations and Chambers',
      'TSC_CCS Code': 'TAC-BTF-5001-1.1',
      'TSC_CCS Type': 'TSC',
      'TSC_CCS Title': 'Business Innovation and Improvement',
      'TSC_CCS Description': 'Transform businesses through innovation and embrace changes to drive improvements',
      'TSC_CCS Category': 'Business Management',
      'Proficiency Level': '5',
      'Proficiency Description': 'Drive business innovation strategy',
      'Knowledge / Ability Items': 'Innovation portfolio planning',
      'Knowledge / Ability Classification': 'Knowledge',
    },
  ],
  tscToUnique: [
    {
      sector_title: 'Accountancy',
      skill_11k_title: 'Business Innovation and Improvement',
      tsc_code: 'ACC-BTF-3001-1.1',
      proficiency_level: '3',
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
    {
      sector_title: 'Accountancy',
      skill_11k_title: 'Business Innovation and Improvement',
      tsc_code: 'ACC-BTF-4001-1.1',
      proficiency_level: '4',
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
    {
      sector_title: 'Accountancy',
      skill_11k_title: 'Business Innovation and Improvement',
      tsc_code: 'ACC-BTF-5001-1.1',
      proficiency_level: '5',
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
    {
      sector_title: 'Trade Associations and Chambers',
      skill_11k_title: 'Business Innovation and Improvement',
      tsc_code: 'TAC-BTF-3001-1.1',
      proficiency_level: '3',
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
    {
      sector_title: 'Trade Associations and Chambers',
      skill_11k_title: 'Business Innovation and Improvement',
      tsc_code: 'TAC-BTF-4001-1.1',
      proficiency_level: '4',
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
    {
      sector_title: 'Trade Associations and Chambers',
      skill_11k_title: 'Business Innovation and Improvement',
      tsc_code: 'TAC-BTF-5001-1.1',
      proficiency_level: '5',
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
  ],
  uniqueSkillsList: [
    {
      parent_skill_title: 'Business Innovation and Improvement',
      parent_skill_description: 'Transform businesses through innovation and embrace changes to drive improvements',
      skill_type: 'Business',
      'Emerging Skills': '',
      'CASL Skills': 'yes',
    },
  ],
  jobRoleCwfKt: [],
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
    const componentSkill = results?.uniqueSkillKeys
      .map((skillKey) => results.uniqueSkills[skillKey])
      .find((skill) => skill.title === 'Component Architecture');
    expect(componentSkill?.roles).toHaveLength(2);
    expect(componentSkill?.proficiencyLevels).toEqual(['3', '5']);
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

  it('splits same-named skills by content variant and merges exact duplicates', () => {
    const dataset = createNormalizedDataset(duplicateTitleFixture);
    const results = buildAnalysis(dataset, [
      'Consulting|||Advisory|||Transformation Analyst',
      'Finance|||Operations|||Operations Manager',
      'Retail|||Operations|||Programme Manager',
    ]);

    expect(results).not.toBeNull();

    const changeManagementVariants =
      results?.uniqueSkillKeys.map((skillKey) => results.uniqueSkills[skillKey]).filter((skill) => skill.title === 'Change Management') ?? [];

    expect(changeManagementVariants).toHaveLength(2);
    expect(new Set(changeManagementVariants.map((skill) => skill.skillKey)).size).toBe(2);

    const mergedVariant = changeManagementVariants.find((skill) => skill.roles.length === 2);
    expect(mergedVariant?.roles.map((role) => role.name)).toEqual(['Programme Manager', 'Transformation Analyst']);
    expect(mergedVariant?.proficiencies['3']?.tscs).toHaveLength(2);

    const splitVariant = changeManagementVariants.find((skill) => skill.roles.length === 1);
    expect(splitVariant?.roles[0]?.name).toBe('Operations Manager');
    expect(splitVariant?.proficiencies['3']?.tscs[0]?.code).toBe('TSC200');
  });

  it('collapses proficiency-coded TSC families into one skill row', () => {
    const dataset = createNormalizedDataset(familyCollapseFixture);
    const results = buildAnalysis(dataset, ['Public Transport|||Rail Systems Maintenance|||Engineer']);
    const skill = results?.roles['Public Transport|||Rail Systems Maintenance|||Engineer']?.uniqueSkills.find(
      (item) => item.title === '22KV Switchgear Systems Maintenance',
    );

    expect(skill).toBeTruthy();
    expect(skill?.combinedFamilies).toHaveLength(1);
    expect(skill?.proficiencyLevels).toEqual(['1', '2', '3', '4']);
    expect(skill?.tscs.map((tsc) => tsc.code)).toEqual([
      'PTP-RSM-1047-1.1',
      'PTP-RSM-2047-1.1',
      'PTP-RSM-3047-1.1',
      'PTP-RSM-4047-1.1',
    ]);
  });

  it('combines identical families across sectors into one final skill row', () => {
    const dataset = createNormalizedDataset(combinedFamilyFixture);
    const results = buildAnalysis(dataset, [
      'Accountancy|||Business Management|||Audit Manager',
      'Trade Associations and Chambers|||Business Management|||Capability Building Manager',
    ]);

    const skill = results?.uniqueSkillKeys
      .map((skillKey) => results.uniqueSkills[skillKey])
      .find((item) => item.title === 'Business Innovation and Improvement');

    expect(skill).toBeTruthy();
    expect(skill?.combinedFamilies).toHaveLength(2);
    expect(skill?.roles.map((role) => role.name)).toEqual(['Audit Manager', 'Capability Building Manager']);
    expect(skill?.proficiencyLevels).toEqual(['3', '4', '5']);
    expect(skill?.tscs).toHaveLength(6);
    expect(skill?.subtitle).toContain('2 families');
    expect(skill?.subtitle).toContain('6 TSCs');
  });
});
