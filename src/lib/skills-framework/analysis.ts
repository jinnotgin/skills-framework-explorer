import { getLevelSortValue, hashString, makeRoleKey, safeStr, sortLevels, toBool } from './utils';
import type {
  AnalysisResults,
  CompareSkillRow,
  GlobalSkillAnalysis,
  NormalizedDataset,
  ProficiencyDetail,
  RoleKey,
  RoleAnalysisRecord,
  SkillRoleReference,
  SkillTsc,
  UniqueSkillAnalysis,
} from './types';

const analysisCache = new WeakMap<NormalizedDataset, Map<string, AnalysisResults | null>>();
const familyAggregateCache = new WeakMap<NormalizedDataset, Map<string, FamilyAggregate>>();
const skillDefinitionCache = new WeakMap<NormalizedDataset, Map<string, SkillDefinition>>();

interface FamilyProficiencyAggregate {
  proficiencyDescription: string;
  knowledgeItems: Set<string>;
  abilityItems: Set<string>;
}

interface FamilyAggregate {
  aggregateKey: string;
  familyKey: string;
  sector: string;
  title: string;
  description: string;
  skillType: string;
  isEmerging: boolean;
  isCasl: boolean;
  tscType: string;
  tscTitle: string;
  tscDescription: string;
  tscCategory: string;
  memberCodes: Set<string>;
  levels: Set<string>;
  proficiencies: Record<string, FamilyProficiencyAggregate>;
}

interface SkillDefinition {
  skillKey: string;
  combinedFamilies: string[];
  title: string;
  description: string;
  skillType: string;
  isEmerging: boolean;
  isCasl: boolean;
}

interface ResolvedSkillVariant {
  definition: SkillDefinition;
  tsc: SkillTsc;
}

function ensureProficiencyRecord(target: Record<string, ProficiencyDetail>, level: string, proficiencyDescription: string): ProficiencyDetail {
  if (!target[level]) {
    target[level] = {
      level,
      proficiencyDescription,
      knowledgeItems: [],
      abilityItems: [],
      tscs: [],
    };
  }

  if (proficiencyDescription && !target[level].proficiencyDescription) {
    target[level].proficiencyDescription = proficiencyDescription;
  }

  return target[level];
}

function ensureFamilyProficiencyRecord(
  target: Record<string, FamilyProficiencyAggregate>,
  level: string,
  proficiencyDescription: string,
): FamilyProficiencyAggregate {
  if (!target[level]) {
    target[level] = {
      proficiencyDescription,
      knowledgeItems: new Set(),
      abilityItems: new Set(),
    };
  }

  if (proficiencyDescription && !target[level].proficiencyDescription) {
    target[level].proficiencyDescription = proficiencyDescription;
  }

  return target[level];
}

function pushUnique(target: string[], values: string[]): void {
  for (const value of values) {
    if (value && !target.includes(value)) {
      target.push(value);
    }
  }
}

function pushUniqueTsc(target: SkillTsc[], value: SkillTsc): void {
  if (!target.find((item) => item.code === value.code && item.proficiency === value.proficiency)) {
    target.push(value);
  }
}

function pushUniqueText(target: Set<string>, values: string[]): void {
  for (const value of values) {
    if (value) {
      target.add(value);
    }
  }
}

function mergeUniqueStrings(target: string[], values: string[]): string[] {
  const output = [...target];
  for (const value of values) {
    if (value && !output.includes(value)) {
      output.push(value);
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
}

function makeCacheKey(roleKeys: RoleKey[]): string {
  return roleKeys.join('\u001f');
}

function compareSkillEntries<T extends { title: string; subtitle: string; skillKey: string }>(left: T, right: T): number {
  return left.title.localeCompare(right.title) || left.subtitle.localeCompare(right.subtitle) || left.skillKey.localeCompare(right.skillKey);
}

function buildSkillSubtitle(tscs: SkillTsc[], combinedFamilies: string[]): string {
  const sectors = Array.from(new Set(tscs.map((tsc) => tsc.sector).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const codes = Array.from(new Set(tscs.map((tsc) => tsc.code).filter(Boolean))).sort((left, right) => left.localeCompare(right));

  const sectorLabel =
    sectors.length === 0 ? '' : sectors.length <= 2 ? sectors.join(', ') : `${sectors.slice(0, 2).join(', ')} +${sectors.length - 2} more`;
  const familyLabel = combinedFamilies.length > 1 ? `${combinedFamilies.length} families` : '';
  const codeLabel = codes.length === 0 ? '' : codes.length === 1 ? codes[0] : `${codes.length} TSCs`;
  const parts = [sectorLabel, familyLabel, codeLabel].filter(Boolean);

  return parts.join(' · ');
}

function makeSkillKey(title: string, fingerprint: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${slug || 'skill'}-${hashString(fingerprint)}`;
}

function deriveTscFamilyKey(code: string, proficiencyLevel: string): string | null {
  const match = safeStr(code).match(/^([A-Z]+-[A-Z]+-)(\d)(\d{3}.*)$/);
  if (!match || safeStr(proficiencyLevel) !== match[2]) {
    return null;
  }

  return `${match[1]}*${match[3]}`;
}

function makeFamilyAggregateKey(sector: string, title: string, familyKey: string): string {
  return `${sector}\u001f${title}\u001f${familyKey}`;
}

function buildFamilySignature(family: FamilyAggregate): string {
  const levels = sortLevels(family.levels);

  return JSON.stringify({
    title: family.title,
    description: family.description,
    skillType: family.skillType,
    isEmerging: family.isEmerging,
    isCasl: family.isCasl,
    tscType: family.tscType,
    tscTitle: family.tscTitle,
    tscDescription: family.tscDescription,
    tscCategory: family.tscCategory,
    levels: levels.map((level) => ({
      level,
      proficiencyDescription: family.proficiencies[level]?.proficiencyDescription ?? '',
      knowledgeItems: [...(family.proficiencies[level]?.knowledgeItems ?? [])].sort((left, right) => left.localeCompare(right)),
      abilityItems: [...(family.proficiencies[level]?.abilityItems ?? [])].sort((left, right) => left.localeCompare(right)),
    })),
  });
}

function getFamilyAggregates(dataset: NormalizedDataset): Map<string, FamilyAggregate> {
  const cached = familyAggregateCache.get(dataset);
  if (cached) {
    return cached;
  }

  const aggregates = new Map<string, FamilyAggregate>();

  for (const row of dataset.tscToUnique) {
    const code = safeStr(row.tsc_code);
    const proficiency = safeStr(row.proficiency_level);
    const title = safeStr(row.parent_skill_title);
    if (!code || !title) {
      continue;
    }

    const info = dataset.tscInfoByCode[code];
    const sector = safeStr(row.sector_title) || info?.sector || '';
    const familyKey = deriveTscFamilyKey(code, proficiency) ?? code;
    const aggregateKey = makeFamilyAggregateKey(sector, title, familyKey);
    const skillRow = dataset.uniqueSkillByTitle[title];
    const kAndA = dataset.kAndAByCodeProf[`${code}|${proficiency}`];

    if (!aggregates.has(aggregateKey)) {
      aggregates.set(aggregateKey, {
        aggregateKey,
        familyKey,
        sector,
        title,
        description: safeStr(skillRow?.parent_skill_description ?? row.parent_skill_description),
        skillType: safeStr(row.skill_type ?? skillRow?.skill_type),
        isEmerging: toBool(row['Emerging Skills'] ?? skillRow?.['Emerging Skills']),
        isCasl: toBool(row['CASL Skills'] ?? skillRow?.['CASL Skills']),
        tscType: info?.type ?? '',
        tscTitle: info?.title || code,
        tscDescription: info?.description ?? '',
        tscCategory: info?.category ?? '',
        memberCodes: new Set(),
        levels: new Set(),
        proficiencies: {},
      });
    }

    const aggregate = aggregates.get(aggregateKey)!;
    aggregate.memberCodes.add(code);
    if (proficiency) {
      aggregate.levels.add(proficiency);
    }

    const proficiencyRecord = ensureFamilyProficiencyRecord(aggregate.proficiencies, proficiency, kAndA?.proficiencyDescription ?? '');
    pushUniqueText(proficiencyRecord.knowledgeItems, kAndA?.knowledgeItems ?? []);
    pushUniqueText(proficiencyRecord.abilityItems, kAndA?.abilityItems ?? []);
  }

  familyAggregateCache.set(dataset, aggregates);
  return aggregates;
}

function makeFallbackSkillDefinition(
  dataset: NormalizedDataset,
  code: string,
  sector: string,
  title: string,
  proficiency: string,
  type: string,
  skillType: string,
  isEmerging: boolean,
  isCasl: boolean,
): SkillDefinition {
  const info = dataset.tscInfoByCode[code];
  const skillRow = dataset.uniqueSkillByTitle[title];
  const description = safeStr(skillRow?.parent_skill_description);
  const kAndA = dataset.kAndAByCodeProf[`${code}|${proficiency}`];
  const familyKey = deriveTscFamilyKey(code, proficiency) ?? code;
  const aggregateKey = makeFamilyAggregateKey(sector, title, familyKey);
  const fingerprint = JSON.stringify({
    title,
    description,
    skillType,
    isEmerging,
    isCasl,
    tscType: info?.type || type,
    tscTitle: info?.title || code,
    tscDescription: info?.description ?? '',
    tscCategory: info?.category ?? '',
    levels: [
      {
        level: proficiency,
        proficiencyDescription: kAndA?.proficiencyDescription ?? '',
        knowledgeItems: [...(kAndA?.knowledgeItems ?? [])].sort((left, right) => left.localeCompare(right)),
        abilityItems: [...(kAndA?.abilityItems ?? [])].sort((left, right) => left.localeCompare(right)),
      },
    ],
  });

  return {
    skillKey: makeSkillKey(title, fingerprint),
    combinedFamilies: [aggregateKey],
    title,
    description,
    skillType,
    isEmerging,
    isCasl,
  };
}

function getSkillDefinitions(dataset: NormalizedDataset): Map<string, SkillDefinition> {
  const cached = skillDefinitionCache.get(dataset);
  if (cached) {
    return cached;
  }

  const familyAggregates = getFamilyAggregates(dataset);
  const grouped = new Map<string, { aggregate: FamilyAggregate; combinedFamilies: Set<string> }>();

  for (const aggregate of familyAggregates.values()) {
    const fingerprint = buildFamilySignature(aggregate);
    const skillKey = makeSkillKey(aggregate.title, fingerprint);
    const existing = grouped.get(skillKey);
    if (!existing) {
      grouped.set(skillKey, {
        aggregate,
        combinedFamilies: new Set([aggregate.aggregateKey]),
      });
      continue;
    }

    existing.combinedFamilies.add(aggregate.aggregateKey);
  }

  const definitions = new Map<string, SkillDefinition>();
  for (const { aggregate, combinedFamilies } of grouped.values()) {
    const combinedFamilyList = [...combinedFamilies].sort((left, right) => left.localeCompare(right));
    const fingerprint = buildFamilySignature(aggregate);
    const skillKey = makeSkillKey(aggregate.title, fingerprint);
    const definition: SkillDefinition = {
      skillKey,
      combinedFamilies: combinedFamilyList,
      title: aggregate.title,
      description: aggregate.description,
      skillType: aggregate.skillType,
      isEmerging: aggregate.isEmerging,
      isCasl: aggregate.isCasl,
    };

    for (const familyKey of combinedFamilyList) {
      definitions.set(familyKey, definition);
    }
  }

  skillDefinitionCache.set(dataset, definitions);
  return definitions;
}

function resolveSkillVariant(dataset: NormalizedDataset, code: string, proficiency: string, type: string): ResolvedSkillVariant | null {
  const info = dataset.tscInfoByCode[code];
  const mapping = dataset.tscMappingByCodeProf[`${code}|${proficiency}`] ?? dataset.tscMappingByCode[code];
  const title = safeStr(mapping?.parent_skill_title);
  if (!title) {
    return null;
  }

  const sector = info?.sector || safeStr(mapping?.sector_title);
  const familyKey = deriveTscFamilyKey(code, proficiency) ?? code;
  const aggregateKey = makeFamilyAggregateKey(sector, title, familyKey);
  const definition =
    getSkillDefinitions(dataset).get(aggregateKey) ??
    makeFallbackSkillDefinition(
      dataset,
      code,
      sector,
      title,
      proficiency,
      type,
      safeStr(mapping?.skill_type),
      toBool(mapping?.['Emerging Skills']),
      toBool(mapping?.['CASL Skills']),
    );

  const kAndA = dataset.kAndAByCodeProf[`${code}|${proficiency}`];
  return {
    definition,
    tsc: {
      code,
      sector,
      title: info?.title || code,
      type: info?.type || type,
      proficiency,
      proficiencyDescription: kAndA?.proficiencyDescription ?? '',
      knowledgeItems: [...(kAndA?.knowledgeItems ?? [])],
      abilityItems: [...(kAndA?.abilityItems ?? [])],
      category: info?.category ?? '',
      parentSkillTitle: definition.title,
      skillType: definition.skillType,
      isEmerging: definition.isEmerging,
      isCasl: definition.isCasl,
    },
  };
}

function sortRoles(roles: SkillRoleReference[]): SkillRoleReference[] {
  return roles
    .map((role) => ({
      ...role,
      proficiencies: sortLevels(role.proficiencies),
      proficiency: sortLevels(role.proficiencies).join(', '),
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.track.localeCompare(right.track) || left.sector.localeCompare(right.sector),
    );
}

function finalizeLocalSkill(skill: UniqueSkillAnalysis): UniqueSkillAnalysis {
  const combinedFamilies = [...skill.combinedFamilies].sort((left, right) => left.localeCompare(right));
  return {
    ...skill,
    combinedFamilies,
    subtitle: buildSkillSubtitle(skill.tscs, combinedFamilies),
    proficiencyLevels: sortLevels(Object.keys(skill.proficiencies)),
  };
}

function finalizeGlobalSkill(skill: GlobalSkillAnalysis): GlobalSkillAnalysis {
  const combinedFamilies = [...skill.combinedFamilies].sort((left, right) => left.localeCompare(right));
  return {
    ...skill,
    combinedFamilies,
    subtitle: buildSkillSubtitle(skill.tscs, combinedFamilies),
    roles: sortRoles(skill.roles),
    proficiencyLevels: sortLevels(Object.keys(skill.proficiencies)),
  };
}

export function buildAnalysis(dataset: NormalizedDataset | null, roleKeys: RoleKey[]): AnalysisResults | null {
  if (!dataset || roleKeys.length === 0) {
    return null;
  }

  const cacheKey = makeCacheKey(roleKeys);
  let datasetCache = analysisCache.get(dataset);
  if (!datasetCache) {
    datasetCache = new Map();
    analysisCache.set(dataset, datasetCache);
  }

  const cached = datasetCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const selectedKeySet = new Set(roleKeys);
  const tscRows = dataset.jobRoleTcsCcs.filter((row) => selectedKeySet.has(makeRoleKey(row)));
  const roleResults: AnalysisResults['roles'] = {};
  const globalSkills: AnalysisResults['uniqueSkills'] = {};
  let totalTscs = 0;

  for (const roleKey of roleKeys) {
    const roleMeta = dataset.roleByKey[roleKey];
    if (!roleMeta) {
      continue;
    }

    const roleTscs = tscRows.filter((row) => makeRoleKey(row) === roleKey);
    const uniqueSkillsMap = new Map<string, UniqueSkillAnalysis>();
    const tscList: SkillTsc[] = [];

    for (const row of roleTscs) {
      const code = safeStr(row['TSC_CCS Code']);
      const proficiency = safeStr(row['Proficiency Level']);
      const type = safeStr(row['TSC_CCS Type']);
      const info = dataset.tscInfoByCode[code];
      const mapping = dataset.tscMappingByCodeProf[`${code}|${proficiency}`] ?? dataset.tscMappingByCode[code];
      const kAndA = dataset.kAndAByCodeProf[`${code}|${proficiency}`];
      const baseTsc: SkillTsc = {
        code,
        sector: info?.sector || safeStr(mapping?.sector_title),
        title: info?.title || code,
        type: info?.type || type,
        proficiency,
        proficiencyDescription: kAndA?.proficiencyDescription ?? '',
        knowledgeItems: [...(kAndA?.knowledgeItems ?? [])],
        abilityItems: [...(kAndA?.abilityItems ?? [])],
        category: info?.category ?? '',
        parentSkillTitle: safeStr(mapping?.parent_skill_title),
        skillType: safeStr(mapping?.skill_type),
        isEmerging: toBool(mapping?.['Emerging Skills']),
        isCasl: toBool(mapping?.['CASL Skills']),
      };
      const resolved = resolveSkillVariant(dataset, code, proficiency, type);
      tscList.push(baseTsc);
      totalTscs += 1;

      if (!resolved) {
        continue;
      }

      const { definition, tsc } = resolved;

      if (!uniqueSkillsMap.has(definition.skillKey)) {
        uniqueSkillsMap.set(definition.skillKey, {
          skillKey: definition.skillKey,
          combinedFamilies: [...definition.combinedFamilies],
          title: definition.title,
          subtitle: '',
          description: definition.description,
          skillType: definition.skillType,
          isEmerging: definition.isEmerging,
          isCasl: definition.isCasl,
          proficiencies: {},
          proficiencyLevels: [],
          tscs: [],
        });
      }

      const localSkill = uniqueSkillsMap.get(definition.skillKey)!;
      localSkill.combinedFamilies = mergeUniqueStrings(localSkill.combinedFamilies, definition.combinedFamilies);
      const localProficiency = ensureProficiencyRecord(localSkill.proficiencies, proficiency, tsc.proficiencyDescription);
      pushUnique(localProficiency.knowledgeItems, tsc.knowledgeItems);
      pushUnique(localProficiency.abilityItems, tsc.abilityItems);
      pushUniqueTsc(localProficiency.tscs, tsc);
      pushUniqueTsc(localSkill.tscs, tsc);

      if (!globalSkills[definition.skillKey]) {
        globalSkills[definition.skillKey] = {
          skillKey: definition.skillKey,
          combinedFamilies: [...definition.combinedFamilies],
          title: definition.title,
          subtitle: '',
          description: definition.description,
          roles: [],
          proficiencies: {},
          proficiencyLevels: [],
          tscs: [],
        };
      }

      const globalSkill = globalSkills[definition.skillKey];
      globalSkill.combinedFamilies = mergeUniqueStrings(globalSkill.combinedFamilies, definition.combinedFamilies);
      const roleRef = globalSkill.roles.find((item) => item.key === roleKey);
      if (!roleRef) {
        globalSkill.roles.push({
          key: roleKey,
          name: roleMeta.role,
          sector: roleMeta.sector,
          track: roleMeta.track,
          proficiency,
          proficiencies: [proficiency],
        });
      } else if (!roleRef.proficiencies.includes(proficiency)) {
        roleRef.proficiencies.push(proficiency);
      }

      const globalProficiency = ensureProficiencyRecord(globalSkill.proficiencies, proficiency, tsc.proficiencyDescription);
      pushUnique(globalProficiency.knowledgeItems, tsc.knowledgeItems);
      pushUnique(globalProficiency.abilityItems, tsc.abilityItems);
      pushUniqueTsc(globalProficiency.tscs, tsc);
      pushUniqueTsc(globalSkill.tscs, tsc);
    }

    const uniqueSkills = Array.from(uniqueSkillsMap.values()).map(finalizeLocalSkill).sort(compareSkillEntries);

    roleResults[roleKey] = {
      role: roleMeta.role,
      sector: roleMeta.sector,
      track: roleMeta.track,
      description: roleMeta.description,
      performance: roleMeta.performance,
      cwf: dataset.roleCwfByKey[roleKey] ?? [],
      uniqueSkills,
      tscs: tscList,
    };
  }

  const finalizedGlobalSkills = Object.values(globalSkills).map(finalizeGlobalSkill).sort(compareSkillEntries);
  const uniqueSkillKeys = finalizedGlobalSkills.map((skill) => skill.skillKey);
  const uniqueSkills = finalizedGlobalSkills.reduce<AnalysisResults['uniqueSkills']>((acc, skill) => {
    acc[skill.skillKey] = skill;
    return acc;
  }, {});
  const filteredRoleKeys = roleKeys.filter((key) => key in roleResults);

  const result = {
    roles: roleResults,
    roleKeys: filteredRoleKeys,
    uniqueSkills,
    uniqueSkillKeys,
    totalRoles: filteredRoleKeys.length,
    totalUniqueSkills: uniqueSkillKeys.length,
    totalTscs,
  };

  datasetCache.set(cacheKey, result);
  return result;
}

export function buildSkillsIndex(dataset: NormalizedDataset | null, roleKeys?: RoleKey[]): AnalysisResults | null {
  if (!dataset) {
    return null;
  }

  const effectiveRoleKeys = roleKeys?.length ? roleKeys : dataset.roles.map((role) => role.key);
  return buildAnalysis(dataset, effectiveRoleKeys);
}

export function buildCompareRows(results: AnalysisResults | null, role1Key: RoleKey | null, role2Key: RoleKey | null): CompareSkillRow[] {
  if (!results || !role1Key || !role2Key) {
    return [];
  }

  const role1 = results.roles[role1Key];
  const role2 = results.roles[role2Key];
  if (!role1 || !role2) {
    return [];
  }

  const skills1 = new Map(role1.uniqueSkills.map((skill) => [skill.skillKey, skill]));
  const skills2 = new Map(role2.uniqueSkills.map((skill) => [skill.skillKey, skill]));
  const skillKeys = Array.from(new Set([...skills1.keys(), ...skills2.keys()])).sort((leftKey, rightKey) => {
    const left = skills1.get(leftKey) ?? skills2.get(leftKey)!;
    const right = skills1.get(rightKey) ?? skills2.get(rightKey)!;
    return compareSkillEntries(left, right);
  });

  return skillKeys.map((skillKey) => {
    const skill1 = skills1.get(skillKey) ?? null;
    const skill2 = skills2.get(skillKey) ?? null;
    const display = skill1 ?? skill2!;

    return {
      skillKey,
      title: display.title,
      subtitle: display.subtitle,
      skill1,
      skill2,
      prof1: skill1 ? skill1.proficiencyLevels.map((level) => getLevelSortValue(level)).filter((level): level is number => level !== null) : [],
      prof2: skill2 ? skill2.proficiencyLevels.map((level) => getLevelSortValue(level)).filter((level): level is number => level !== null) : [],
    };
  });
}

export function buildAnalysisFromRoleAnalyses(roleAnalyses: RoleAnalysisRecord[]): AnalysisResults | null {
  if (!roleAnalyses.length) {
    return null;
  }

  const roles: AnalysisResults['roles'] = {};
  const globalSkills: AnalysisResults['uniqueSkills'] = {};
  let totalTscs = 0;

  for (const roleAnalysis of roleAnalyses) {
    roles[roleAnalysis.roleKey] = {
      role: roleAnalysis.role,
      sector: roleAnalysis.sector,
      track: roleAnalysis.track,
      description: roleAnalysis.description,
      performance: roleAnalysis.performance,
      cwf: roleAnalysis.cwf,
      uniqueSkills: roleAnalysis.uniqueSkills,
      tscs: roleAnalysis.tscs,
    };
    totalTscs += roleAnalysis.tscs.length;

    for (const skill of roleAnalysis.uniqueSkills) {
      if (!globalSkills[skill.skillKey]) {
        globalSkills[skill.skillKey] = {
          skillKey: skill.skillKey,
          combinedFamilies: [...skill.combinedFamilies],
          title: skill.title,
          subtitle: '',
          description: skill.description,
          roles: [],
          proficiencies: {},
          proficiencyLevels: [],
          tscs: [],
        };
      }

      const globalSkill = globalSkills[skill.skillKey];
      globalSkill.combinedFamilies = mergeUniqueStrings(globalSkill.combinedFamilies, skill.combinedFamilies);
      globalSkill.roles.push({
        key: roleAnalysis.roleKey,
        name: roleAnalysis.role,
        sector: roleAnalysis.sector,
        track: roleAnalysis.track,
        proficiency: skill.proficiencyLevels.join(', '),
        proficiencies: [...skill.proficiencyLevels],
      });

      for (const level of skill.proficiencyLevels) {
        const localLevel = skill.proficiencies[level];
        if (!localLevel) {
          continue;
        }

        const globalLevel = ensureProficiencyRecord(globalSkill.proficiencies, level, localLevel.proficiencyDescription);
        pushUnique(globalLevel.knowledgeItems, localLevel.knowledgeItems);
        pushUnique(globalLevel.abilityItems, localLevel.abilityItems);
        for (const tsc of localLevel.tscs) {
          pushUniqueTsc(globalLevel.tscs, tsc);
          pushUniqueTsc(globalSkill.tscs, tsc);
        }
      }
    }
  }

  const finalizedGlobalSkills = Object.values(globalSkills).map(finalizeGlobalSkill).sort(compareSkillEntries);
  const uniqueSkillKeys = finalizedGlobalSkills.map((skill) => skill.skillKey);

  return {
    roles,
    roleKeys: roleAnalyses.map((roleAnalysis) => roleAnalysis.roleKey),
    uniqueSkills: finalizedGlobalSkills.reduce<AnalysisResults['uniqueSkills']>((acc, skill) => {
      acc[skill.skillKey] = skill;
      return acc;
    }, {}),
    uniqueSkillKeys,
    totalRoles: roleAnalyses.length,
    totalUniqueSkills: uniqueSkillKeys.length,
    totalTscs,
  };
}

export function buildAnalysisResultsFromSkillIndex(skillIndex: GlobalSkillAnalysis[], roleKeys: RoleKey[]): AnalysisResults | null {
  if (!skillIndex.length) {
    return null;
  }

  const sortedSkills = [...skillIndex].sort(compareSkillEntries);
  const uniqueSkills = sortedSkills.reduce<AnalysisResults['uniqueSkills']>((acc, skill) => {
    acc[skill.skillKey] = skill;
    return acc;
  }, {});
  const uniqueSkillKeys = sortedSkills.map((skill) => skill.skillKey);
  let totalTscs = 0;

  for (const skill of sortedSkills) {
    for (const level of skill.proficiencyLevels) {
      totalTscs += skill.proficiencies[level]?.tscs.length ?? 0;
    }
  }

  return {
    roles: {},
    roleKeys,
    uniqueSkills,
    uniqueSkillKeys,
    totalRoles: roleKeys.length,
    totalUniqueSkills: uniqueSkillKeys.length,
    totalTscs,
  };
}
