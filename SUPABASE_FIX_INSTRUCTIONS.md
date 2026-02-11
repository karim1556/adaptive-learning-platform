# Supabase Connection Fix Instructions

## Problem
Your app cannot connect to Supabase because the URL `iasdpyoztxffisiipnew.supabase.co` is not resolving (DNS error).

## Solution

### Option 1: Verify Your Supabase Project
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in to your account
3. Check if your project exists and is active
4. If the project is paused, resume it
5. Go to **Settings > API**
6. Copy the correct **Project URL** and **anon public key**

### Option 2: Create a New Supabase Project
If your project was deleted:

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Choose a name and strong password
4. Wait for the project to be created (2-3 minutes)
5. Go to **Settings > API**
6. Copy your credentials:
   - **Project URL** (format: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJhbGci...`)
   - **service_role key** (for admin operations)

### Update Your Environment Variables

Edit `.env.local` and update these lines:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
```

### Database Schema
If you created a new project, you'll need to set up your database:

1. In Supabase Dashboard, go to **SQL Editor**
2. Run the setup scripts in order:
   ```
   scripts/01-create-schema.sql
   scripts/02-seed-data.sql
   scripts/03-additional-tables.sql
   ```

### Restart Your Development Server

After updating `.env.local`:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
pnpm dev
```

## Code Issues Fixed ✅

I've already fixed these code errors:
- ✅ Removed invalid `.status` property from PostgrestError checks in teacher projects page
- ✅ Fixed `onConflict` parameter in lesson-service.ts (changed from array to string)

## Next Steps

1. **Update your Supabase credentials** in `.env.local`
2. **Restart the dev server**
3. **Test the login** - the authentication errors should be gone

If you need help setting up a new Supabase project or running the database scripts, let me know!
