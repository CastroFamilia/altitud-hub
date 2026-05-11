const fs = require('fs');
const { execSync } = require('child_process');

let eslintOutput = '';
try {
  eslintOutput = execSync('npx eslint . --format json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
} catch (error) {
  eslintOutput = error.stdout;
}

const data = JSON.parse(eslintOutput);

data.forEach(file => {
  const issues = file.messages.filter(m => m.ruleId === '@next/next/no-img-element');
  if (issues.length > 0) {
    let content = fs.readFileSync(file.filePath, 'utf8');
    
    // Add import if not present
    if (!content.includes('import Image from \'next/image\'') && !content.includes('import Image from "next/image"')) {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + 'import Image from \'next/image\';\n' + content.slice(endOfLine + 1);
      } else {
        content = 'import Image from \'next/image\';\n' + content;
      }
    }

    // Replace <img> with <Image ... />
    // Using a more robust regex that allows multiline tags
    const imgRegex = /<img([\s\S]*?)>/g;
    content = content.replace(imgRegex, (match, attrs) => {
      let isSelfClosing = attrs.trim().endsWith('/');
      if (isSelfClosing) attrs = attrs.slice(0, -1).trim();
      
      let newAttrs = attrs;
      
      if (!newAttrs.includes('fill') && !newAttrs.includes('width=')) {
        if (newAttrs.includes('w-full') || newAttrs.includes('100%') || newAttrs.includes('inset-0')) {
          newAttrs += ' fill';
        } else {
          let wMatch = newAttrs.match(/w-(\d+)/);
          let hMatch = newAttrs.match(/h-(\d+)/);
          if (wMatch && hMatch) {
             let w = parseInt(wMatch[1]) * 4;
             let h = parseInt(hMatch[1]) * 4;
             if (!isNaN(w) && !isNaN(h)) {
                newAttrs += ` width={${w}} height={${h}}`;
             } else {
                newAttrs += ' width={100} height={100} unoptimized';
             }
          } else {
             newAttrs += ' width={100} height={100} unoptimized';
          }
        }
      }
      
      return `<Image ${newAttrs} />`;
    });

    fs.writeFileSync(file.filePath, content);
    console.log('Fixed images in', file.filePath);
  }
});
