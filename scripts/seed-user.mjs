import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ikvhmrbdywuzpwuymtaq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000000';

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERRO: Defina SUPABASE_SERVICE_KEY como variavel de ambiente.');
  console.error('Exemplo (PowerShell): $env:SUPABASE_SERVICE_KEY="sua-key-aqui"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  const email = 'edcarlos.nascimento3@gmail.com';
  const password = 'Suspeito10*';

  // 1. Criar ou verificar usuario seed
  console.log('1. Verificando se usuario ja existe...');
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existing = users.find(u => u.email === email);

  let userId;
  if (existing) {
    console.log(`   Usuario ja existe: ${existing.id}`);
    userId = existing.id;
  } else {
    console.log('2. Criando usuario seed...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error('   Erro ao criar usuario:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`   Usuario criado: ${userId}`);
  }

  // 3. Migrar dados do placeholder para o usuario real
  console.log('3. Verificando dados no placeholder...');
  const { data: placeholderRows } = await supabase
    .from('app_data')
    .select('*')
    .eq('user_id', PLACEHOLDER_UUID);

  if (!placeholderRows || placeholderRows.length === 0) {
    console.log('   Nenhum dado no placeholder. Nada a migrar.');
  } else {
    console.log(`   Encontrados ${placeholderRows.length} registros.`);

    for (const row of placeholderRows) {
      console.log(`   Migrando: ${row.key}...`);
      const { error: updateError } = await supabase
        .from('app_data')
        .update({ user_id: userId })
        .eq('key', row.key)
        .eq('user_id', PLACEHOLDER_UUID);

      if (updateError) {
        console.error(`      Erro ao migrar ${row.key}: ${updateError.message}`);
      }
    }

    // Verificar se sobrou algo no placeholder
    const { count } = await supabase
      .from('app_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', PLACEHOLDER_UUID);

    if (count === 0) {
      console.log('   Placeholder vazio — remocoes bem-sucedidas.');
    } else {
      console.log(`   Ainda ha ${count} registros no placeholder.`);
    }
  }

  console.log('\nConcluido!');
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
  console.log(`User ID: ${userId}`);
}

seed().catch(console.error);
