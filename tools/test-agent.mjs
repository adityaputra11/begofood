import { spawn } from 'child_process';

const server = spawn('node', ['dist/src/main'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3001' },
});

server.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  if (text.includes('Nest application successfully started')) {
    setTimeout(test, 500);
  }
});

server.stderr.on('data', (d) => process.stderr.write(d));

async function test() {
  try {
    const BASE = 'http://localhost:3001';

    // Test analyze dengan Exa
    console.log('\n=== Analyze: Rendang Sapi (dengan Exa) ===');
    const r = await fetch(`${BASE}/agent/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rendang Sapi',
        description: 'Daging sapi dimasak santan dan bumbu rempah khas Padang',
      }),
    });
    const d = await r.json();
    console.log(JSON.stringify(d, null, 2));

    console.log('\n✅ Selesai');
  } catch (e) {
    console.error('❌', e.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}
