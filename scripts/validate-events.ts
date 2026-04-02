import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import Ajv from 'ajv';

const SCHEMA_PATH = join(__dirname, 'event-schema.json');
const EVENTS_DIR = join(__dirname, '..', 'data', 'events');

interface ValidationError {
  file: string;
  path: string;
  message: string;
}

function loadSchema(): object {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
}

function findEventFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findEventFiles(fullPath));
      } else if (stat.isFile() && extname(entry) === '.json') {
        files.push(fullPath);
      }
    }
  } catch {
    return [];
  }

  return files;
}

function validateEvents(): { success: boolean; errors: ValidationError[]; total: number } {
  const schema = loadSchema();
  const ajv = new Ajv({ allErrors: true, verbose: true });
  const validate = ajv.compile(schema);

  const eventFiles = findEventFiles(EVENTS_DIR);
  const errors: ValidationError[] = [];

  for (const file of eventFiles) {
    let data: unknown;

    try {
      data = JSON.parse(readFileSync(file, 'utf-8'));
    } catch (e) {
      errors.push({
        file,
        path: '/',
        message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      });
      continue;
    }

    const valid = validate(data);

    if (!valid && validate.errors) {
      for (const err of validate.errors) {
        errors.push({
          file,
          path: err.instancePath || '/',
          message: err.message || 'Unknown validation error',
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    total: eventFiles.length,
  };
}

const result = validateEvents();

if (result.success) {
  console.log(`Validated ${result.total} event files: all passed`);
  process.exit(0);
} else {
  console.log(`Failed:`);
  for (const err of result.errors) {
    const relativePath = err.file.replace(process.cwd(), '').replace(/^[\\\/]/, '');
    console.log(`  ${relativePath}${err.path} — ${err.message}`);
  }
  process.exit(1);
}