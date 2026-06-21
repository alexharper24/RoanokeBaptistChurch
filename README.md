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

## Security

The site is just files, with no database, logins, or plugins, so the attacks that hit WordPress don't apply here. Protect the GitHub and domain-registrar logins with strong passwords and two-factor authentication. The repository is public, so never put anything private in it.
