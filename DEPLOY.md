# 2026 NFL Draft Big Board Builder — Deploy Guide

## Step 1: Create Supabase Project (2 min)

1. Go to **https://supabase.com** → sign in (or create account)
2. Click **New Project**
3. Name it `draft-board`, pick a region, set a DB password, click **Create**
4. Wait ~1 min for it to provision

## Step 2: Run the Database Schema (1 min)

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the entire contents of `schema.sql` from this project
4. Click **Run**
5. You should see "Success. No rows returned" — that's correct

## Step 3: Enable Magic Link Auth (1 min)

1. In Supabase, go to **Authentication** → **Providers** (left sidebar)
2. **Email** should already be enabled by default
3. Make sure "Enable Email Signup" is ON
4. That's it — magic link works out of the box

## Step 4: Get Your Supabase Keys (30 sec)

1. Go to **Settings** → **API** (left sidebar)
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key (long string starting with `eyJ...`)

## Step 5: Set Up the Project Locally (2 min)

Open Terminal:

```bash
cd ~/Desktop
# If you downloaded the project files, navigate to the folder:
cd draft-board

# Create .env file with your Supabase creds
cat > .env << EOF
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
EOF

# Install dependencies
npm install

# Test locally
npm run dev
```

Open http://localhost:5173 — you should see the login screen.

## Step 6: Push to GitHub (1 min)

```bash
cd ~/Desktop/draft-board
git init
git add .
git commit -m "draft board builder v1"

# Create a repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/draft-board.git
git branch -M main
git push -u origin main
```

## Step 7: Deploy to Vercel (2 min)

1. Go to **https://vercel.com** → sign in with GitHub
2. Click **Add New** → **Project**
3. Import your `draft-board` repo
4. Before clicking Deploy, add **Environment Variables**:
   - `VITE_SUPABASE_URL` → your project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**
6. Wait ~60 seconds

## Step 8: Add Vercel URL to Supabase (30 sec)

1. Copy your Vercel URL (e.g. `https://draft-board-abc123.vercel.app`)
2. In Supabase → **Authentication** → **URL Configuration**
3. Set **Site URL** to your Vercel URL
4. Under **Redirect URLs**, add your Vercel URL (e.g. `https://draft-board-abc123.vercel.app`)

## Step 9: Custom Domain (optional)

In Vercel → your project → **Settings** → **Domains** → add your domain.
Then update the Supabase Site URL and Redirect URLs to match.

## Done!

Your app is live. Users sign in with email magic link, build their board,
and it saves to Supabase automatically. They can come back anytime
and their board is right where they left it.
