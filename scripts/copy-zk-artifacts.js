import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'contract/managed/proofxshield');
const destination = path.join(root, 'public/contract/managed/proofxshield');

await mkdir(path.dirname(destination), { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
console.log('Published ProofXShield proving keys and zkIR to public/contract/managed/proofxshield');
