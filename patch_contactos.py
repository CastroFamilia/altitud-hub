import re

with open('src/app/contactos/ContactosClient.jsx', 'r') as f:
    content = f.read()

# 1. Remove TopNav import
content = re.sub(r"import TopNav from '@/components/layout/TopNav';\n", "", content)

# 2. Remove TopNav and Layout wrappers from render
content = content.replace("<>\n      <TopNav titleKey=\"nav_crm\" subtitleKey=\"contact_dash_desc\" />\n\n      <div className=\"flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-[#0B1120]\">\n        <div className=\"max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20\">", "<>\n        <div className=\"space-y-6 md:space-y-8 pb-20\">")

# 3. Remove closing wrappers (replace the last occurrences)
# "        </div>\n      </div>\n    </>"
content = content.replace("        </div>\n      </div>\n    </>", "        </div>\n    </>")

with open('src/app/contactos/ContactosClient.jsx', 'w') as f:
    f.write(content)
print("Patched ContactosClient.jsx")
