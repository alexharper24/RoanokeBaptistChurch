# Roanoke Baptist Church Website

A real multi-page website, optimized so the church can be found on Google. Each page is its own file with its own title, description, and search-engine metadata. The pages share one stylesheet, one script, and one image folder.

## What's in this folder

```
index.html         Home
our-church.html    Our Church (pastor, staff, and Life at Roanoke)
beliefs.html       What We Believe (Statement of Faith)
gospel.html        The Gospel
ministries.html    Ministries
torch.html         The Torch (newsletter)
404.html           Friendly "page not found" page
style.css          All styling (shared by every page)
main.js            All behavior: menu, Scripture pop-outs, Give modal
img/               All images, the logo, and the favicon
sitemap.xml        Lists the pages for search engines
robots.txt         Tells search engines they may index the site
.nojekyll          Tells GitHub to serve the files exactly as-is

admin/             The Torch editor for church staff (sign-in required)
worker/            Cloudflare Worker: the Torch API and page rendering
schema.sql         Database tables for the newsletter
seed-2026-08.sql   The August 2026 issue, as first content
wrangler.jsonc     Cloudflare configuration
.assetsignore      Files that must not be published to the web
```

Upload **everything in this folder** (including the `img` folder and the files that start with a dot). The most common go-live problem is uploading only the HTML and ending up with broken images.

## The domain

Every page's address tags (canonical, social-share, sitemap, structured data) are set to **https://roanokebaptistonline.com**. If you host it on a different domain, tell me and I'll update those URLs, or do a find-and-replace for `roanokebaptistonline.com` across `index.html`, the other `.html` files, `sitemap.xml`, and `robots.txt`. The links between pages are relative, so they work no matter the domain.

## Put it online with GitHub Pages (free)

1. Create a free account at github.com.
2. Create a new **public** repository (a name like `roanoke-baptist` is fine).
3. Upload the **contents of this folder** to the repository root (Add file > Upload files; drag everything in, including the `img` folder). `index.html` must sit at the top level, not inside a subfolder.
4. Go to **Settings > Pages**, choose **Deploy from a branch**, set branch `main` and folder `/ (root)`, and save.
5. In a minute or two the site is live at `https://YOUR-USERNAME.github.io/roanoke-baptist/`.

### Use the roanokebaptistonline.com domain

1. In **Settings > Pages > Custom domain**, enter `roanokebaptistonline.com` and save (GitHub writes a `CNAME` file for you).
2. At your DNS provider (GoDaddy), set:
   - Four **A** records on `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One **CNAME** on `www` pointing to `YOUR-USERNAME.github.io`
3. Wait for DNS to take effect (minutes to a few hours), then check **Enforce HTTPS**. SSL is automatic, nothing to buy.

## Getting found on Google (this is the SEO part)

Already built into the site:
- Each page has a location-specific title and description ("... in Roanoke, Indiana").
- The home page carries **Church structured data** (address, phone, service times) that feeds Google's map and local results.
- Social-share tags so a shared link shows a title, blurb, and the church photo.
- A sitemap and robots file so search engines can find and index every page.

What you still need to do off the site (this is what actually drives local traffic):

1. **Google Business Profile** at google.com/business. Claim/verify "Roanoke Baptist Church, Roanoke IN." This is the single biggest lever for showing up on Google Maps and local search.
2. **Google Search Console** at search.google.com/search-console. Add the site and submit `sitemap.xml` so it gets indexed in days rather than weeks.
3. Link the website from the church **Facebook** page.
4. Keep the **name, address, and phone identical** across the website, Facebook, and Google. Consistency helps ranking.

## Visitor analytics (optional)

GitHub Pages keeps no visitor logs. To see traffic, create a free Google Analytics property, copy the Measurement ID (`G-XXXXXXXXXX`), and send it to me. I'll add the snippet to every page. It shows page views, city-level location, and device, but not individual visitor IP addresses.

## Editing later

To change wording or swap a photo, edit the file and re-upload it. Because styling lives in `style.css` and behavior in `main.js`, a look-and-feel change is made once and applies to every page. Send the change to me and I'll hand back the updated files.

## A couple of honest notes

- The **Give** button opens a simple on-page note with the Zelle address. A static site can't process payments directly; if you want a real online-giving button later, link out to a provider.
- Three ministry cards (Children, Wednesday Kids' Clubs, Ladies' Fellowship) and the Missions card use an icon instead of a photo, and the Bus Ministry card currently shows a family portrait rather than a bus. Send real photos and I'll drop them in.
- The welcome/building photo is low-resolution; a higher-resolution original would sharpen it.
- The choir photo leads the "Life At Roanoke Baptist" gallery on **Our Church**, and the "Boldly Go!" flag display anchors a missions banner at the bottom of **Ministries**. Full-size originals are kept in `img/archive/`; the web copies in `img/` are resized to 1200px wide.
- The Torch page now shows **August 2026**, transcribed from the printed PDF, minus the birthdays and anniversaries. Two graphics were lifted out of that PDF (`img/torch-2026-08-*.jpg`); the rest of its images are clip art and were left behind.
- **Still to do before the editor is usable:** create the D1 database and R2 bucket, set up the Cloudflare Access application, and fill in the four `PASTE_...` placeholders in `wrangler.jsonc`. See "The Torch editor" above.
- **Not yet decided:** the September 5 Steele/Bachman wedding was in the printed August issue but is left off the website, since it names private individuals on a page anyone can read. Add it back if the church would rather it were public.

## The Torch editor (Cloudflare)

The newsletter page is no longer hand-coded each month. Church staff sign in and
publish it themselves. The rest of the site is unchanged and still plain files.

### How it works

`torch.html` ships with the latest issue written into it as ordinary HTML. When
the site runs on Cloudflare, the Worker looks up the current issue and swaps that
content in before the page reaches the visitor, so search engines see real text
rather than something filled in afterwards by JavaScript. If the database is ever
unreachable, the page falls back to the copy baked into the file. It cannot go
blank.

### A note on privacy

**The printed Torch lists member birthdays and anniversaries. The website does
not, and should not.** About two dozen full names with dates appear in the August
2026 PDF. Publishing those puts real people's dates of birth on a public page that
Google will index.

Three things enforce this:

1. There is no database column for personal celebration dates.
2. The "fill in events from this text" button skips anything under a birthday or
   anniversary heading, and says how many lines it left out.
3. Publishing is blocked with a warning if the content still looks like a list of
   names and dates. A person has to confirm before it will save.

The uploaded PDF is kept privately by default for the church's own records. There
is a checkbox to publish it for download, and it is off on purpose. Do not tick it
while the PDF contains the birthday page.

### First-time setup

Run these once, from this folder, signed in with `wrangler login`:

```bash
npx wrangler d1 create roanoke-torch
```

Paste the returned `database_id` into `wrangler.jsonc`, then:

```bash
npx wrangler r2 bucket create roanoke-torch-files
npm run db:init
npm run seed
npx wrangler deploy
```

Then create the Access application that guards the editor:

1. Cloudflare dashboard, **Zero Trust > Access > Applications**, add a
   self-hosted application covering `roanokebaptistonline.com/admin` and
   `roanokebaptistonline.com/api/admin`.
2. Policy: **Allow**, include the specific staff email addresses. A Gmail address
   is fine. The one-time PIN login emails a code, so there is no password and no
   account for anyone to create.
3. Copy the application's **AUD** tag and your team name into `ACCESS_TEAM_DOMAIN`
   and `ACCESS_AUD` in `wrangler.jsonc`, then deploy again.
4. **Turn off the `workers.dev` route** for this Worker. Access protects the
   custom domain; the workers.dev address would be a way around it. The Worker
   also verifies the signed Access token on every admin request as a second line
   of defence, but do both.

Until steps 1 to 3 are done, `/admin` returns "sign in required" and refuses
everything. That is the intended state, not a bug.

### Running it locally

```bash
npm install
npx wrangler dev --persist-to ../.wrangler-state/roanoke
```

`--persist-to` has to point outside this folder. The site files are served from
the repository root, so Cloudflare's local database writes would otherwise look
like edited files and the dev server would restart in a loop.

### Publishing an issue

Sign in at `/admin`, choose the month, paste the newsletter text to fill in the
dates, adjust the sections, upload the PDF and any event artwork, then **Preview**
and **Publish**. Save as draft at any point; drafts are not visible to the public.

## Security

The site is just files, with no database, logins, or plugins, so the attacks that hit WordPress don't apply here. Protect the GitHub and domain-registrar logins with strong passwords and two-factor authentication. The repository is public, so never put anything private in it.
