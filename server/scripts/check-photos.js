// Shows which demo products have a photo in seed-images/, and helps fix file names.
//   npm run photos           -> report
//   npm run photos -- --fix  -> also renames files when the right name is obvious
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'seed-images');
const EXT = /\.(jpe?g|png|webp)$/i;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const seed = fs.readFileSync(path.join(__dirname, 'seed.js'), 'utf8');
const products = [...seed.matchAll(/name: (?:'((?:[^'\\]|\\.)*)'|"([^"]*)"), price/g)].map((m) =>
  (m[1] || m[2]).replace(/\\'/g, "'")
);
const slugs = products.map(slugify);

fs.mkdirSync(DIR, { recursive: true });
const files = fs.readdirSync(DIR).filter((f) => EXT.test(f));
const baseOf = (f) => f.replace(EXT, '').toLowerCase().replace(/-[2-4]$/, '');

const tokens = (s) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
const similarity = (a, b) => {
  const A = tokens(a);
  const B = tokens(b);
  const shared = [...A].filter((t) => B.has(t)).length;
  return shared / new Set([...A, ...B]).size;
};

const have = new Set(files.map((f) => baseOf(f)));
const withPhoto = products.filter((_, i) => have.has(slugs[i]));
const without = products.filter((_, i) => !have.has(slugs[i]));

console.log(`\nPhotos folder: ${DIR}`);
console.log(`${files.length} image file(s) found.\n`);
console.log(`Products WITH a photo (${withPhoto.length}):`);
withPhoto.forEach((n) => console.log(`  ok       ${n}`));
console.log(`\nProducts WITHOUT a photo (${without.length}):`);
without.forEach((n) => console.log(`  missing  ${n}   <- name the file  ${slugify(n)}.jpg`));

const stray = files.filter((f) => !slugs.includes(baseOf(f)));
if (stray.length) {
  console.log(`\nFiles that do not match any product name (${stray.length}):`);
  const fix = process.argv.includes('--fix');
  for (const f of stray) {
    const ranked = products
      .map((n, i) => ({ n, slug: slugs[i], score: similarity(f.replace(EXT, ''), n) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const unique = best && (!ranked[1] || ranked[1].score < best.score);
    if (!best) {
      console.log(`  ${f}   <- no similar product. Rename it to one of the names above.`);
    } else if (fix && unique && best.score >= 0.5 && !have.has(best.slug)) {
      const ext = path.extname(f).toLowerCase();
      fs.renameSync(path.join(DIR, f), path.join(DIR, best.slug + ext));
      have.add(best.slug);
      console.log(`  ${f}   -> renamed to ${best.slug}${ext}  (${best.n})`);
    } else {
      const options = ranked.slice(0, 2).map((r) => `${r.slug}.jpg`).join('  or  ');
      console.log(`  ${f}   <- maybe  ${options}`);
    }
  }
  if (!fix) console.log('\nTip: add  -- --fix  to rename the obvious ones automatically.');
}
console.log('\nWhen the names look right, run:  npm run seed\n');
