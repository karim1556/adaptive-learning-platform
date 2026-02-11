// Usage:
// SUPABASE_URL=https://<proj>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role-key> ADMIN_EMAIL=admin@school.com ADMIN_PASSWORD=Admin1234 node scripts/seed-admin.js

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = process.env.ADMIN_EMAIL || 'admin@school.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin1234'

  if (!url || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  try {
    console.log('Creating admin user:', email)
    const res = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { role: 'admin', firstName: 'Institute', lastName: 'Admin' },
      email_confirm: true,
    })

    if (res.error) {
      console.error('Failed to create user:', res.error)
      process.exit(1)
    }

    console.log('Admin user created:', res.user?.id || '(no id returned)')
    console.log('You can now sign in at /login selecting the Admin role.')
  } catch (e) {
    console.error('Error creating admin user:', e)
    process.exit(1)
  }
}

main()
