import { makeRoleKey, safeStr, sortLevels, toBool } from './utils';
import type {
  AnalysisResults,
  CompareSkillRow,
  GlobalSkillAnalysis,
  NormalizedDataset,
  ProficiencyDetail,
  RoleKey,
  SkillRoleReference,
  SkillTsc,
  UniqueSkillAnalysis,
} from './types';

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

export function buildAnalysis(dataset: NormalizedDataset | null, roleKeys: RoleKey[]): AnalysisResults | null {
  if (!dataset || roleKeys.length === 0) {
    return null;
  }

  const selectedKeySet = new Set(roleKeys);
  const roles = dataset.jobRoleDescriptions.filter((row) => selectedKeySet.has(makeRoleKey(row)));
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
      const uniqueSkillTitle = safeStr(mapping?.parent_skill_title);
      const kAndA = dataset.kAndAByCodeProf[`${code}|${proficiency}`];

      const tsc: SkillTsc = {
        code,
        title: info?.title || code,
        type,
        proficiency,
        proficiencyDescription: kAndA?.proficiencyDescription ?? '',
        knowledgeItems: kAndA?.knowledgeItems ?? [],
        abilityItems: kAndA?.abilityItems ?? [],
        category: info?.category ?? '',
        parentSkillTitle: uniqueSkillTitle,
        skillType: safeStr(mapping?.skill_type),
        isEmerging: toBool(mapping?.['Emerging Skills']),
        isCasl: toBool(mapping?.['CASL Skills']),
      };

      tscList.push(tsc);
      totalTscs += 1;

      if (!uniqueSkillTitle) {
        continue;
      }

      if (!uniqueSkillsMap.has(uniqueSkillTitle)) {
        const skillRow = dataset.uniqueSkillByTitle[uniqueSkillTitle];
        uniqueSkillsMap.set(uniqueSkillTitle, {
          title: uniqueSkillTitle,
          description: safeStr(skillRow?.parent_skill_description),
          skillType: tsc.skillType,
          isEmerging: tsc.isEmerging,
          isCasl: tsc.isCasl,
          proficiencies: {},
          proficiencyLevels: [],
          tscs: [],
        });
      }

      const localSkill = uniqueSkillsMap.get(uniqueSkillTitle)!;
      const localProficiency = ensureProficiencyRecord(localSkill.proficiencies, proficiency, tsc.proficiencyDescription);
      pushUnique(localProficiency.knowledgeItems, tsc.knowledgeItems);
      pushUnique(localProficiency.abilityItems, tsc.abilityItems);
      pushUniqueTsc(localProficiency.tscs, tsc);
      pushUniqueTsc(localSkill.tscs, tsc);

      if (!globalSkills[uniqueSkillTitle]) {
        const skillRow = dataset.uniqueSkillByTitle[uniqueSkillTitle];
        globalSkills[uniqueSkillTitle] = {
          title: uniqueSkillTitle,
          description: safeStr(skillRow?.parent_skill_description),
          roles: [],
          proficiencies: {},
          proficiencyLevels: [],
        };
      }

      const globalSkill = globalSkills[uniqueSkillTitle];
      const roleRef = globalSkill.roles.find((item) => item.key === roleKey);
      if (!roleRef) {
        const nextRole: SkillRoleReference = {
          key: roleKey,
          name: roleMeta.role,
          sector: roleMeta.sector,
          track: roleMeta.track,
          proficiency,
          proficiencies: [proficiency],
        };
        globalSkill.roles.push(nextRole);
      } else if (!roleRef.proficiencies.includes(proficiency)) {
        roleRef.proficiencies.push(proficiency);
        roleRef.proficiencies = sortLevels(roleRef.proficiencies);
        roleRef.proficiency = roleRef.proficiencies.join(', ');
      }

      const globalProficiency = ensureProficiencyRecord(globalSkill.proficiencies, proficiency, tsc.proficiencyDescription);
      pushUnique(globalProficiency.knowledgeItems, tsc.knowledgeItems);
      pushUnique(globalProficiency.abilityItems, tsc.abilityItems);
      pushUniqueTsc(globalProficiency.tscs, tsc);
    }

    const uniqueSkills = Array.from(uniqueSkillsMap.values())
      .map((skill) => ({
        ...skill,
        proficiencyLevels: sortLevels(Object.keys(skill.proficiencies)),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));

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

  const uniqueSkillTitles = Object.keys(globalSkills).sort((left, right) => left.localeCompare(right));
  for (const title of uniqueSkillTitles) {
    globalSkills[title].roles = globalSkills[title].roles
      .map((role) => ({
        ...role,
        proficiencies: sortLevels(role.proficiencies),
        proficiency: sortLevels(role.proficiencies).join(', '),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
    globalSkills[title].proficiencyLevels = sortLevels(Object.keys(globalSkills[title].proficiencies));
  }

  return {
    roles: roleResults,
    roleKeys: roleKeys.filter((key) => key in roleResults),
    uniqueSkills: globalSkills,
    uniqueSkillTitles,
    totalRoles: roles.length,
    totalUniqueSkills: uniqueSkillTitles.length,
    totalTscs,
  };
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

  const skills1 = new Map(role1.uniqueSkills.map((skill) => [skill.title, skill]));
  const skills2 = new Map(role2.uniqueSkills.map((skill) => [skill.title, skill]));
  const titles = Array.from(new Set([...skills1.keys(), ...skills2.keys()])).sort((left, right) => left.localeCompare(right));

  return titles.map((title) => {
    const skill1 = skills1.get(title) ?? null;
    const skill2 = skills2.get(title) ?? null;

    return {
      title,
      skill1,
      skill2,
      prof1: skill1 ? skill1.proficiencyLevels.map((level) => Number(level)).filter(Number.isFinite) : [],
      prof2: skill2 ? skill2.proficiencyLevels.map((level) => Number(level)).filter(Number.isFinite) : [],
    };
  });
}
