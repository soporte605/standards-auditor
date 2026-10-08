#!/usr/bin/env node
import { runCli } from './commands.js';

try {
  process.exitCode = await runCli(process.argv.slice(2));
} catch (error) {
  console.error(
    `No se pudo completar la operación: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 2;
}
