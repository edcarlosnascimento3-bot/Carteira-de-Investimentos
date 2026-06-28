/**
 * Script único para migrar seus dados locais (db_*.json) para o Supabase.
 *
 * Como usar:
 *   1. Execute o SQL em supabase-migration.sql no dashboard do Supabase
 *   2. node scripts/migrate-to-supabase.mjs
 *
 * Pré-requisitos: Node 18+ e as variáveis de ambiente abaixo
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ikvhmrbdywuzpwuymtaq.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

const DB_NAMES = ['transactions', 'proventos', 'user', 'ativos', 'corretoras', 'rf_manual']

async function migrate() {
  if (!SUPABASE_KEY) {
    console.error('Defina VITE_SUPABASE_ANON_KEY nas variáveis de ambiente')
    process.exit(1)
  }

  for (const name of DB_NAMES) {
    const filePath = new URL(`../db_${name}.json`, import.meta.url)
    let data
    try {
      const { readFileSync, existsSync } = await import('fs')
      if (!existsSync(filePath)) {
        console.log(`  pulando ${name} (arquivo não encontrado)`)
        continue
      }
      data = JSON.parse(readFileSync(filePath, 'utf-8'))
    } catch {
      console.log(`  pulando ${name} (erro ao ler)`)
      continue
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: name, value: data }),
    })

    if (res.ok) {
      console.log(`  OK: ${name} (${Array.isArray(data) ? data.length + ' registros' : 'objeto'})`)
    } else {
      console.error(`  ERRO: ${name} — ${res.status} ${await res.text()}`)
    }
  }
}

migrate()
