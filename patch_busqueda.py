import re

with open('src/app/busqueda/BusquedaClient.jsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useRouter } from 'next/navigation';\nimport AddRequirementModal from '@/components/busqueda/AddRequirementModal';\nimport AddExternalPropertyModal from '@/components/busqueda/AddExternalPropertyModal';")

# 2. Remove TopNav import
content = re.sub(r"import TopNav from '@/components/layout/TopNav';\n", "", content)

# 3. Add router = useRouter() inside component
content = content.replace("const { profile, supabase } = useAuth();", "const { profile, supabase } = useAuth();\n  const router = useRouter();")

# 4. Remove form, tagInput, handleAddTag, handleRemoveTag
content = re.sub(r"const \[form, setForm\] = useState\(\{[\s\S]*?\}\);\n\n  const locationsIndex = getACMFlatIndex\(\);\n\n  const \[tagInput, setTagInput\] = useState\(\{ zone: '', must: '', nice: '' \}\);\n  const \[zoneSuggestions, setZoneSuggestions\] = useState\(\[\]\);\n\n  const handleAddTag[\s\S]*?  \};\n", "", content)

# 5. Remove externalForm
content = re.sub(r"const \[externalForm, setExternalForm\] = useState\(\{[\s\S]*?\}\);\n\n", "", content)

# 6. Remove loadSearches
content = re.sub(r"const loadSearches = useCallback\(async \(\) => \{[\s\S]*?\}, \[profile\]\);\n\n\n", "", content)

# 7. Remove handleCreateSearch
content = re.sub(r"const handleCreateSearch = async \(e\) => \{[\s\S]*?    \}\n  \};\n\n", "", content)

# 8. Remove handleAddExternal
content = re.sub(r"const handleAddExternal = async \(e\) => \{[\s\S]*?    \}\n  \};\n\n", "", content)

# 9. Update handleRenewSearch to use router.refresh()
content = content.replace("loadSearches();", "router.refresh();")

# 10. Remove TopNav and Layout wrappers from render
content = content.replace("<>\n      <TopNav title={l.title} subtitle={l.subtitle} />\n\n      <div className=\"flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-dark-bg\">\n        <div className=\"max-w-7xl mx-auto space-y-8\">", "<>\n        <div className=\"space-y-8\">")

# 11. Remove closing wrappers
content = content.replace("        </div>\n      </div>\n\n      {showModal && (", "        </div>\n\n      {showModal && (")

# 12. Replace the modals at the end
# The modals start from {showModal && ( to the end of the file.
content = re.sub(r"\{showModal && \([\s\S]*</>", "<AddRequirementModal isOpen={showModal} onClose={() => setShowModal(false)} l={l} />\n      <AddExternalPropertyModal isOpen={showExternalModal} onClose={() => setShowExternalModal(false)} activeSearchId={selectedSearch?.id} l={l} />\n    </>", content)

with open('src/app/busqueda/BusquedaClient.jsx', 'w') as f:
    f.write(content)
print("Patched BusquedaClient.jsx")
