import { expect } from 'chai';
import 'mocha';
import { promisify } from 'util';
import * as path from 'path';
import { randomBytes } from 'crypto';
import * as rmrf from 'rimraf';
import { writeFile, unlink, mkdir } from 'mz/fs';
import { generate, GeneratedCode, Role } from './index';

function mktemp(): string {
  return path.join(__dirname, '..', 'tmpTestCases', `test-${randomBytes(20).toString('hex')}`);
}

class TestCase {
  constructor(
    public readonly schema: string,
    public readonly dir = mktemp()
  ) {
  }

  public async cleanup() {
    await promisify(rmrf)(this.dir);
  }

  public async generate(role: Role): Promise<GeneratedCode> {
    await mkdir(this.dir);
    const schemaPath = path.join(this.dir, 'schema.ts');
    await writeFile(schemaPath, this.schema);
    return await generate(schemaPath, role);
  }
}

describe('generate', () => {
  it('generates only client code when requested', async () => {
    const code = await new TestCase(`
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`
    ).generate(Role.CLIENT);
    expect(Object.keys(code).sort()).to.eql([
      'client.ts',
      'clientDeps',
      'common.ts',
      'interfaces.ts',
      'koaMW.ts',
    ]);
  });

  it('generates only server code when requested', async () => {
    const code = await new TestCase(`
export interface Test {
  bar: {
    params: {
      a: number;
    };
    returns: string;
  };
}`
    ).generate(Role.SERVER);
    expect(Object.keys(code).sort()).to.eql([
      'common.ts',
      'interfaces.ts',
      'koaMW.ts',
      'server.ts',
      'serverDeps',
    ]);
  });
});