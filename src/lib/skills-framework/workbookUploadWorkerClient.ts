import { createNormalizedDataset, deriveWorkbookStatusFromRawData, parseWorkbookFiles } from './parser';
import type {
  NormalizedDataset,
  WorkbookKind,
  WorkbookProcessingProgress,
  WorkbookStatus,
} from './types';

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

export interface WorkbookUploadResult {
  dataset: NormalizedDataset | null;
  workbookStatus: Record<WorkbookKind, WorkbookStatus>;
}

export async function parseWorkbookFilesInWorker(
  files: File[],
  onProgress?: (progress: WorkbookProcessingProgress) => void,
): Promise<WorkbookUploadResult> {
  if (typeof Worker === 'undefined') {
    onProgress?.({ message: 'Processing uploaded workbooks.', percent: null });
    const rawData = await parseWorkbookFiles(files);
    return {
      dataset: createNormalizedDataset(rawData),
      workbookStatus: deriveWorkbookStatusFromRawData(rawData),
    };
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workbookUploadWorker.ts', import.meta.url), { type: 'module' });

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      if (message.type === 'progress') {
        onProgress?.(message.progress);
        return;
      }

      worker.terminate();

      if (message.type === 'complete') {
        resolve({
          dataset: message.dataset,
          workbookStatus: message.workbookStatus,
        });
        return;
      }

      reject(new Error(message.message));
    });

    worker.addEventListener('error', (error) => {
      worker.terminate();
      reject(new Error(error.message || 'Failed to parse uploaded workbooks'));
    });

    worker.postMessage({ type: 'parse', files });
  });
}
