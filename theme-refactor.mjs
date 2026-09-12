import fs from 'fs';
import path from 'path';

function processFile(filePath) {
    if (filePath.includes('node_modules') || filePath.includes('.git')) return;

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        fs.readdirSync(filePath).forEach(f => processFile(path.join(filePath, f)));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let original = content;

        // Colors
        content = content.replace(/bg-\[\#070710\]/g, "bg-[#f8fafc] dark:bg-[#070710]");
        content = content.replace(/text-white(?!\/)/g, "text-zinc-900 dark:text-white");
        content = content.replace(/text-white\/(\d+|\[\d+\.\d+\])/g, "text-zinc-900/$1 dark:text-white/$1");
        content = content.replace(/border-white\/(\d+|\[\d+\.\d+\])/g, "border-zinc-900/$1 dark:border-white/$1");
        content = content.replace(/bg-white\/(\d+|\[\d+\.\d+\])/g, "bg-zinc-900/$1 dark:bg-white/$1");

        // Also fix background of page and vs page
        content = content.replace(/bg-\[\#060610\]/g, "bg-white dark:bg-[#060610]");
        content = content.replace(/bg-zinc-950/g, "bg-white dark:bg-zinc-950");
        content = content.replace(/bg-\[\#0d0d12\]/g, "bg-slate-50 dark:bg-[#0d0d12]");

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`Updated ${filePath}`);
        }
    }
}

// Ensure globals.css removes hardcoded background so class takes effect
const rootDir = process.cwd();
processFile(path.join(rootDir, 'app'));
processFile(path.join(rootDir, 'components'));

const globalsCss = path.join(rootDir, 'app/globals.css');
if (fs.existsSync(globalsCss)) {
    let css = fs.readFileSync(globalsCss, 'utf-8');
    css = css.replace(/background-color: #070710;/g, "@apply bg-[#f8fafc] dark:bg-[#070710];");
    css = css.replace(/color: white;/g, "@apply text-zinc-900 dark:text-white;");
    fs.writeFileSync(globalsCss, css, 'utf-8');
    console.log("Updated globals.css");
}
