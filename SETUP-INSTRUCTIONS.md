# The Rowan Tree — Google Merchant Centre Feed: Setup Instructions

This guide walks you through setting up your automated product feed. It has 3 parts:

1. **Create a GitHub account and deploy the feed** (one-time, ~15 minutes)
2. **Set up your Square API token in GitHub** (one-time, ~5 minutes)
3. **Connect the feed to Google Merchant Centre** (one-time, ~5 minutes)

---

## Part 1: Create a GitHub Account and Deploy the Feed

GitHub is a free service that will host your feed file and automatically regenerate it every day.

### Step 1: Create a GitHub account

1. Go to **https://github.com/signup** in your browser
2. Enter your email address (you can use mike@rowantreegifts.co.uk)
3. Create a password
4. Choose a username (e.g., `rowantreegifts` or `therowan-tree`)
5. Complete the verification puzzle
6. Click **Create account**
7. Check your email and enter the verification code GitHub sends you
8. When asked to personalise, you can click **Skip this for now** at the bottom

### Step 2: Create a new repository

1. Once logged in to GitHub, click the **+** icon in the top-right corner
2. Click **New repository**
3. Fill in:
   - **Repository name**: `square-google-feed`
   - **Description**: `Google Merchant Centre product feed for The Rowan Tree`
   - Set it to **Public** (this is required for free GitHub Pages hosting)
   - **DO NOT** tick "Add a README file" — leave it unticked
4. Click **Create repository**
5. You'll see a page with setup instructions — **keep this page open**, you'll need the URL shown there

### Step 3: Upload the project files

The easiest way to upload the files is using GitHub's web interface:

1. On the repository page you just created, you'll see a section that says **"uploading an existing file"** — click that link
2. If you don't see that, click **"Add file"** → **"Upload files"** at the top of the repository page
3. Open the **square-google-feed** folder I've provided in your Product Feed folder
4. **Drag all the files and folders** from that folder into the GitHub upload area:
   - `.github/` folder (contains the automated workflow)
   - `docs/` folder
   - `generate-feed.js`
   - `package.json`
   - `package-lock.json`
   - `.gitignore`
   - `.env.example`
   - This `SETUP-INSTRUCTIONS.md` file
5. In the "Commit changes" box at the bottom, type: `Initial setup`
6. Make sure **"Commit directly to the main branch"** is selected
7. Click **Commit changes**

**Important:** Make sure the `.github` folder is uploaded. On Mac, files starting with `.` are hidden by default. In Finder, press `Cmd + Shift + .` to show hidden files before dragging.

### Step 4: Enable GitHub Pages

1. In your repository, click **Settings** (the gear icon tab at the top)
2. In the left sidebar, click **Pages**
3. Under **Build and deployment**, change the **Source** dropdown to **GitHub Actions**
4. That's it — no other changes needed here

---

## Part 2: Add Your Square API Token to GitHub

Your Square API token is a secret key that lets the script read your product catalogue. We store it securely as a GitHub "Secret" so it's never visible in your code.

### Step 1: Get your Square access token

If you already have your token, skip to Step 2.

1. Go to **https://developer.squareup.com/apps** and log in with your Square account
2. If you don't see an application listed, click **Create Application** (or the **+** button)
   - Name it something like `Google Feed` and click **Save**
3. Click on your application to open it
4. In the left sidebar, click **Credentials**
5. Make sure the toggle at the top says **Production** (not Sandbox)
6. You'll see **Production Access Token** — click **Show** to reveal it
7. Click the **Copy** button to copy the token
8. **Keep this token secret** — anyone with it can read your Square data

### Step 2: Add the token to GitHub

1. Go back to your GitHub repository (https://github.com/YOUR-USERNAME/square-google-feed)
2. Click **Settings** (the gear icon tab at the top)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click the green **New repository secret** button
5. Fill in:
   - **Name**: `SQUARE_ACCESS_TOKEN` (type this exactly, all capitals with underscores)
   - **Secret**: Paste your Square access token here
6. Click **Add secret**

### Step 3: Run the feed generator for the first time

1. In your repository, click the **Actions** tab at the top
2. You should see **"Generate Google Merchant Feed"** in the left sidebar — click it
3. You'll see a message about the workflow. Click the **Run workflow** dropdown button (it's on the right side)
4. Click the green **Run workflow** button
5. Wait 1–3 minutes. Refresh the page — you should see a green tick ✅ when it's complete
6. If you see a red ✗, click on it to see the error message and let me know what it says

### Step 4: Verify your feed is live

Your feed should now be accessible at:

**`https://YOUR-USERNAME.github.io/square-google-feed/feed.xml`**

(Replace `YOUR-USERNAME` with the GitHub username you chose in Step 1)

Open this URL in your browser. You should see XML data with your products listed. If you see your product names and prices, everything is working!

---

## Part 3: Connect to Google Merchant Centre

### Step 1: Add the feed in Google Merchant Centre

1. Go to **https://merchants.google.com** and sign in
2. In the left sidebar, click **Products** → **Feeds**
3. Click the **+** button (or **Add feed**) to create a new primary feed
4. Fill in:
   - **Country of sale**: United Kingdom
   - **Language**: English
   - Click **Continue**
5. Name the feed: `Square Product Feed`
6. Select **Scheduled fetch** as the method
7. Click **Continue**
8. Fill in the fetch details:
   - **File URL**: `https://YOUR-USERNAME.github.io/square-google-feed/feed.xml`
     (use your actual GitHub username)
   - **Fetch frequency**: Daily
   - **Fetch time**: Choose any time after 5:00 AM (UK time) — the feed regenerates at 5am
   - **Time zone**: United Kingdom
   - **Username and Password**: Leave blank (not needed)
9. Click **Create feed**

### Step 2: Trigger the first fetch

1. After creating the feed, you should see it listed under your feeds
2. Click on the feed name
3. Click **Fetch now** to pull the data immediately
4. Wait a few minutes, then check the **Diagnostics** tab to see how many products were accepted

---

## How It All Works (Plain English)

Here's what happens automatically every day:

1. **At 5am UK time**, GitHub runs the feed generator script
2. The script connects to your Square catalogue and downloads all your products
3. It converts the data into the exact format Google Merchant Centre expects
4. The XML feed file is published to a public web address (your GitHub Pages URL)
5. Google Merchant Centre fetches the feed on its schedule and updates your product listings

**You don't need to do anything** after the initial setup — it's fully automatic.

---

## Troubleshooting

### The GitHub Actions workflow failed (red ✗)
- Click on the failed run to see the error log
- Most commonly this is caused by an incorrect Square API token — double-check you used the **Production** token (not Sandbox) and that it's correctly pasted in the GitHub secret

### Products are missing from the feed
- The feed only includes products that are active (not archived) in your Square catalogue
- Products without prices will still appear in the feed but Google will likely reject them — the issues report flags these

### Google Merchant Centre is rejecting products
- Check the issues report (available at `https://YOUR-USERNAME.github.io/square-google-feed/issues-report.txt`)
- Common reasons: missing images, missing prices, missing descriptions
- Fix these in your Square Dashboard, and the next daily feed update will include the changes

### I need to regenerate the feed right now (not wait until tomorrow)
1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click **Generate Google Merchant Feed** in the sidebar
4. Click **Run workflow** → **Run workflow**
5. Wait 1–3 minutes for it to complete

---

## Your Feed URLs

After setup, these are your important URLs:

| What | URL |
|------|-----|
| **Product feed** (give this to Google) | `https://YOUR-USERNAME.github.io/square-google-feed/feed.xml` |
| **Issues report** | `https://YOUR-USERNAME.github.io/square-google-feed/issues-report.txt` |
| **GitHub repository** | `https://github.com/YOUR-USERNAME/square-google-feed` |
| **Workflow runs** (check if feed is generating) | `https://github.com/YOUR-USERNAME/square-google-feed/actions` |

Replace `YOUR-USERNAME` with your actual GitHub username.
