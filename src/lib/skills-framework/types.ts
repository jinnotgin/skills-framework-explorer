export type RawRow = Record<string, unknown>;
export type RoleKey = string;
export type SkillKey = string;
export type WorkbookKind = 'framework' | 'tscMap' | 'unique';
export type ImportMode = 'none' | 'preloaded' | 'upload';
export type CompareFilter = 'all' | 'shared' | 'diff' | 'role1' | 'role2';
export type DetailKind = 'role-skill' | 'compare-skill' | 'skill-centric';
export type PreloadedDataSource = 'indexeddb' | 'fallback-memory';
export type DatasetSyncState = 'idle' | 'checking' | 'downloading' | 'rebuilding' | 'ready' | 'error';

export interface PreloadedDatasetMetadata {
  generatedAt: string;
}

export interface DatasetMetaSnapshot {
  generatedAt: string;
  source: PreloadedDataSource;
}

export interface DatasetRawData {
  generatedAt?: string;
  jobRoleDescriptions: RawRow[];
  jobRoleTcsCcs: RawRow[];
  tscKAndA: RawRow[];
  tscToUnique: RawRow[];
  uniqueSkillsList: RawRow[];
  jobRoleCwfKt: RawRow[];
}

export interface WorkbookStatus {
  loaded: boolean;
  filename: string;
}

export interface WorkbookProcessingProgress {
  message: string;
  percent: number | null;
}

export interface RoleSummary {
  key: RoleKey;
  role: string;
  sector: string;
  track: string;
  description: string;
  performance: string;
}

export interface CriticalWorkFunction {
  title: string;
  tasks: string[];
}

export interface SkillTsc {
  code: string;
  sector: string;
  title: string;
  type: string;
  proficiency: string;
  proficiencyDescription: string;
  knowledgeItems: string[];
  abilityItems: string[];
  category: string;
  parentSkillTitle: string;
  skillType: string;
  isEmerging: boolean;
  isCasl: boolean;
}

export interface ProficiencyDetail {
  level: string;
  proficiencyDescription: string;
  knowledgeItems: string[];
  abilityItems: string[];
  tscs: SkillTsc[];
}

export interface UniqueSkillAnalysis {
  skillKey: SkillKey;
  combinedFamilies: string[];
  title: string;
  subtitle: string;
  description: string;
  skillType: string;
  isEmerging: boolean;
  isCasl: boolean;
  proficiencies: Record<string, ProficiencyDetail>;
  proficiencyLevels: string[];
  tscs: SkillTsc[];
}

export interface SkillRoleReference {
  key: RoleKey;
  name: string;
  sector: string;
  track: string;
  proficiency: string;
  proficiencies: string[];
}

export interface GlobalSkillAnalysis {
  skillKey: SkillKey;
  combinedFamilies: string[];
  title: string;
  subtitle: string;
  description: string;
  roles: SkillRoleReference[];
  proficiencies: Record<string, ProficiencyDetail>;
  proficiencyLevels: string[];
  tscs: SkillTsc[];
}

export interface RoleAnalysis {
  role: string;
  sector: string;
  track: string;
  description: string;
  performance: string;
  cwf: CriticalWorkFunction[];
  uniqueSkills: UniqueSkillAnalysis[];
  tscs: SkillTsc[];
}

export interface AnalysisResults {
  roles: Record<RoleKey, RoleAnalysis>;
  roleKeys: RoleKey[];
  uniqueSkills: Record<string, GlobalSkillAnalysis>;
  uniqueSkillKeys: SkillKey[];
  totalRoles: number;
  totalUniqueSkills: number;
  totalTscs: number;
}

export interface TscInfoEntry {
  type: string;
  title: string;
  description: string;
  category: string;
  sector: string;
}

export interface KAndAEntry {
  code: string;
  proficiencyLevel: string;
  proficiencyDescription: string;
  knowledgeItems: string[];
  abilityItems: string[];
}

export interface NormalizedDataset extends DatasetRawData {
  roles: RoleSummary[];
  roleByKey: Record<RoleKey, RoleSummary>;
  sectors: string[];
  tscInfoByCode: Record<string, TscInfoEntry>;
  tscMappingByCodeProf: Record<string, RawRow>;
  tscMappingByCode: Record<string, RawRow>;
  uniqueSkillByTitle: Record<string, RawRow>;
  kAndAByCodeProf: Record<string, KAndAEntry>;
  roleCwfByKey: Record<RoleKey, CriticalWorkFunction[]>;
}

export interface DetailState {
  open: boolean;
  kind: DetailKind | null;
  skillKey: SkillKey;
  skillTitle: string;
  roleKey: RoleKey | null;
  role1Key: RoleKey | null;
  role2Key: RoleKey | null;
  focusedRoleKey: RoleKey | null;
}

export interface CompareSkillRow {
  skillKey: SkillKey;
  title: string;
  subtitle: string;
  skill1: UniqueSkillAnalysis | null;
  skill2: UniqueSkillAnalysis | null;
  prof1: number[];
  prof2: number[];
}

export interface DatasetMetaRecord {
  id: 'current';
  app: string;
  schemaVersion: number;
  generatedAt: string;
  source: 'preloaded';
  rebuiltAt: string;
}

export interface RoleCatalogRecord {
  roleKey: RoleKey;
  role: string;
  sector: string;
  track: string;
  description: string;
  performance: string;
  searchText: string;
}

export interface RoleCwfRecord {
  roleKey: RoleKey;
  cwf: CriticalWorkFunction[];
}

export interface RoleAnalysisRecord extends RoleAnalysis {
  roleKey: RoleKey;
}

export interface SkillIndexRecord extends GlobalSkillAnalysis {}
