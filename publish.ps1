# Publish the latest changes to GitHub Pages.
# Usage: .\publish.ps1 "added client kavinė aroma"
param([string]$Message = "update")

$env:Path = "C:\Program Files\Git\cmd;$env:Path"

git add -A
git commit -m $Message
git push origin main

# rebuild the site branch from public/ and push to both hosts
git branch -D gh-pages 2>$null
git subtree split --prefix public -b gh-pages
git push -f site gh-pages:main      # primary: https://projektai777.github.io/
git push -f origin gh-pages         # backup:  https://crystalius7.github.io/lojalumas/

Write-Host "`nPublished. Live in ~1 min at https://projektai777.github.io/" -ForegroundColor Green
