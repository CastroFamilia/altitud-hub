import re

with open('src/app/DashboardClient.jsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useRouter } from 'next/navigation';")

# 2. Remove fetchEntries function
content = re.sub(r"async function fetchEntries\(profileId\) \{[\s\S]*?return loadEntries\(\);\n\}\n", "", content)

# 3. Update component signature
content = content.replace("export default function DashboardClient() {", "export default function DashboardClient({ initialEntries = [], initialFollowUps = [], initialActiveCount = 0, initialSoldStats = { avgDom: 0, recentTrend: 0, count: 0 } }) {")

# 4. Add router = useRouter()
content = content.replace("const { user, profile } = useAuth();", "const { user, profile } = useAuth();\n  const router = useRouter();")

# 5. Initialize state with props
content = content.replace("const [entries, setEntries] = useState([]);", "const [entries, setEntries] = useState(initialEntries);")
content = content.replace("const [followUps, setFollowUps] = useState([]);", "const [followUps, setFollowUps] = useState(initialFollowUps);")
content = content.replace("const [activePropertiesCount, setActivePropertiesCount] = useState(0);", "const [activePropertiesCount, setActivePropertiesCount] = useState(initialActiveCount);")
content = content.replace("const [soldDomStats, setSoldDomStats] = useState({ avgDom: 0, recentTrend: 0, count: 0 });", "const [soldDomStats, setSoldDomStats] = useState(initialSoldStats);")

# 6. Remove the first useEffect that fetches OKRs and handles local plan.
# We STILL NEED the local plan logic. So let's just remove the fetchEntries call.
content = content.replace("    if (profile?.id) {\n      fetchEntries(profile.id).then(setEntries);\n    } else {\n      setEntries(loadEntries());\n    }", "")

# 7. Remove the second useEffect that fetches follow-ups and properties completely.
content = re.sub(r"// Fetch follow-ups\n  useEffect\(\(\) => \{[\s\S]*?  \}, \[profile\?\.id\]\);\n\n", "", content)

# 8. Update markFollowUpDone to call router.refresh()
#   const markFollowUpDone = async (id) => {
#     await supabase.from('lead_follow_ups').update({ status: 'completed' }).eq('id', id);
#     setFollowUps(prev => prev.filter(f => f.id !== id));
#   };
content = content.replace("setFollowUps(prev => prev.filter(f => f.id !== id));", "setFollowUps(prev => prev.filter(f => f.id !== id));\n    router.refresh();")

with open('src/app/DashboardClient.jsx', 'w') as f:
    f.write(content)
print("Patched DashboardClient.jsx")
