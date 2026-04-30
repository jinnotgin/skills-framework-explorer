import * as XLSX from 'xlsx';

import {
  createNormalizedDataset,
  detectWorkbookTypeFromWorkbook,
} from './parser';
import type {
  DatasetRawData,
  NormalizedDataset,
  RawRow,
  WorkbookKind,
  WorkbookProcessingProgress,
  WorkbookStatus,
} from './types';

type WorkerRequest = {
  type: 'parse';
  files: File[];
};

type WorkerResponse =
  | {
      type: 'progress';
      progress: WorkbookProcessingProgress;
    }
  | {
      type: 'complete';
      dataset: NormalizedDataset | null;
      workbookStatus: Record<WorkbookKind, WorkbookStatus>;
    }
  | {
      type: 'error';
      message: string;
    };

function postMessageToClient(message: WorkerResponse) {
  self.postMessage(message);
}

function report(message: string, percent: number | null) {
  postMessageToClient({
    type: 'progress',
    progress: { message, percent },
  });
}

function sheetToJsonIfExists(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  if (!workbook.SheetNames.includes(sheetName)) {
    return [];
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }) as RawRow[];
}

function emptyWorkbookStatus(): Record<WorkbookKind, WorkbookStatus> {
  return {
    framework: { loaded: false, filename: '' },
    tscMap: { loaded: false, filename: '' },
    unique: { loaded: false, filename: '' },
  };
}

function rawDataFromWorkbooks(workbooks: Partial<Record<WorkbookKind, XLSX.WorkBook>>): DatasetRawData {
  return {
    jobRoleDescriptions: workbooks.framework ? sheetToJsonIfExists(workbooks.framework, 'Job Role_Description') : [],
    jobRoleTcsCcs: workbooks.framework ? sheetToJsonIfExists(workbooks.framework, 'Job Role_TCS_CCS') : [],
    tscKAndA: workbooks.framework ? sheetToJsonIfExists(workbooks.framework, 'TSC_CCS_K&A') : [],
    jobRoleCwfKt: workbooks.framework ? sheetToJsonIfExists(workbooks.framework, 'Job Role_CWF_KT') : [],
    tscToUnique: workbooks.tscMap ? sheetToJsonIfExists(workbooks.tscMap, 'TSC to Unique Skill Mapping') : [],
    uniqueSkillsList: workbooks.unique ? sheetToJsonIfExists(workbooks.unique, 'Unique Skills List') : [],
  };
}

async function parseFiles(files: File[]) {
  const workbooks: Partial<Record<WorkbookKind, XLSX.WorkBook>> = {};
  const workbookStatus = emptyWorkbookStatus();
  const xlsxFiles = files.filter((file) => file.name.toLowerCase().endsWith('.xlsx'));

  if (!xlsxFiles.length) {
    throw new Error('Select at least one XLSX workbook.');
  }

  report(`Preparing ${xlsxFiles.length} workbook${xlsxFiles.length === 1 ? '' : 's'} for processing.`, 5);

  for (const [index, file] of xlsxFiles.entries()) {
    const basePercent = 10 + Math.round((index / xlsxFiles.length) * 45);
    report(`Reading ${file.name}.`, basePercent);

    const buffer = await file.arrayBuffer();
    report(`Parsing workbook structure for ${file.name}.`, basePercent + 5);

    const workbook = XLSX.read(buffer, { type: 'array' });
    const kind = detectWorkbookTypeFromWorkbook(workbook);

    if (kind) {
      workbooks[kind] = workbook;
      workbookStatus[kind] = { loaded: true, filename: file.name };
      report(`Detected ${file.name} as a required workbook.`, basePercent + 10);
    } else {
      report(`Skipped ${file.name}; it does not match a required workbook shape.`, basePercent + 10);
    }
  }

  report('Extracting workbook sheets.', 65);
  const rawData = rawDataFromWorkbooks(workbooks);

  report('Building the searchable dataset.', 85);
  const dataset = createNormalizedDataset(rawData);

  report('Upload processing complete.', 100);
  postMessageToClient({
    type: 'complete',
    dataset,
    workbookStatus,
  });
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'parse') {
    return;
  }

  parseFiles(event.data.files).catch((error: unknown) => {
    postMessageToClient({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to parse uploaded workbooks',
    });
  });
});
