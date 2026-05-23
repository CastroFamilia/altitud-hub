import os
import re

SRC_DIR = 'src'
CONTEXT_FILE = 'src/lib/context.js'

pattern = re.compile(r"lang\s*===\s*'en'\s*\?\s*(['\"])(.*?)\1\s*:\s*(['\"])(.*?)\3")

def slugify(text):
    text = text.lower()
    text = "".join(c if c.isalnum() else "_" for c in text)
    text = re.sub(r'_+', '_', text).strip('_')
    words = text.split('_')
    if not words or words[0] == '':
        return "auto_empty"
    return "auto_" + "_".join(words[:4])

def ensure_t_imported(content):
    if 'useApp(' in content:
        if ' t ' not in content and '{t' not in content and 't,' not in content and ',t' not in content:
            content = re.sub(r'const\s*\{\s*([^}]*lang[^}]*)\s*\}\s*=\s*useApp\(\)', r'const { \1, t } = useApp()', content)
    return content

new_entries = {}
modified_files = {}

for root, _, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            if filepath == CONTEXT_FILE:
                continue
                
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            matches = pattern.findall(content)
            
            if matches:
                for match in matches:
                    quote1, en_text, quote2, es_text = match
                    full_match_str = f"lang === 'en' ? {quote1}{en_text}{quote1} : {quote2}{es_text}{quote2}"
                    
                    key = slugify(en_text)
                    orig_key = key
                    counter = 1
                    while key in new_entries and new_entries[key]['en'] != en_text:
                        key = f"{orig_key}_{counter}"
                        counter += 1
                        
                    new_entries[key] = {'en': en_text, 'es': es_text}
                    content = content.replace(full_match_str, f"t('{key}')")
                
                content = ensure_t_imported(content)
                if content != original_content:
                    modified_files[filepath] = content

for filepath, content in modified_files.items():
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Update context.js
if new_entries:
    with open(CONTEXT_FILE, 'r', encoding='utf-8') as f:
        ctx_lines = f.readlines()
    
    es_end_idx = -1
    en_end_idx = -1
    
    for i, line in enumerate(ctx_lines):
        if line.strip() == 'en: {':
            es_end_idx = i - 1
            while ctx_lines[es_end_idx].strip() == '':
                es_end_idx -= 1
            break
            
    in_t = False
    brace_count = 0
    for i, line in enumerate(ctx_lines):
        if 'const T = {' in line:
            in_t = True
            brace_count += 1
        elif in_t:
            brace_count += line.count('{')
            brace_count -= line.count('}')
            if brace_count == 0:
                en_end_idx = i - 1
                while ctx_lines[en_end_idx].strip() == '':
                    en_end_idx -= 1
                break

    if es_end_idx != -1 and en_end_idx != -1:
        es_str = ""
        en_str = ""
        for key, val in new_entries.items():
            en_val = val['en'].replace("'", "\\'")
            es_val = val['es'].replace("'", "\\'")
            es_str += f"    {key}: '{es_val}',\n"
            en_str += f"    {key}: '{en_val}',\n"
        
        ctx_lines.insert(en_end_idx, en_str)
        ctx_lines.insert(es_end_idx, es_str)
        
        with open(CONTEXT_FILE, 'w', encoding='utf-8') as f:
            f.writelines(ctx_lines)
        print("Updated context.js successfully.")
    else:
        print(f"Could not find insert points in context.js. es_end={es_end_idx}, en_end={en_end_idx}")

print(f"Extracted {len(new_entries)} strings across {len(modified_files)} files.")

