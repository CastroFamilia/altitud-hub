import re

with open('src/app/oficina/OficinaClient.jsx', 'r') as f:
    content = f.read()

# 1. Remove loadData and its useEffect
content = re.sub(r"  // Load data\n  const loadData = useCallback\(async \(\) => \{[\s\S]*?\}, \[supabase, selectedOffice\]\);\n\n     \n  useEffect\(\(\) => \{ \n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    loadData\(\); \n  \}, \[loadData\]\);\n", "", content)

# 2. Add the specific useEffect for apiAgents
api_agents_effect = """  // Fetch API agents when office changes
  useEffect(() => {
    const fetchApiAgents = async () => {
      try {
        const agentsRes = await fetch(`/api/agents-feed?office=${selectedOffice}`);
        const agentsData = await agentsRes.json();
        setApiAgents(agentsData.agents || []);
      } catch (err) {
        console.error('Failed to load API agents', err);
      }
    };
    fetchApiAgents();
  }, [selectedOffice]);
"""
# We will place this right below `const [agentSearchQuery, setAgentSearchQuery] = useState('');` which is followed by the redirect useEffect
# Actually, let's place it right before `// Filter profiles by office and search query`
content = content.replace("  // Filter profiles by office and search query", api_agents_effect + "\n  // Filter profiles by office and search query")

# 3. Replace loadData() with router.refresh() in handlers
content = content.replace("        loadData();\n      } else {\n        alert(data.error || t('ofc_approve_error'));", "        router.refresh();\n      } else {\n        alert(data.error || t('ofc_approve_error'));")
content = content.replace("        setInviteForm({ full_name: '', email: '', role: 'agent', team_id: '' });\n        loadData();", "        setInviteForm({ full_name: '', email: '', role: 'agent', team_id: '' });\n        router.refresh();")
content = content.replace("      if (data.success) {\n        loadData();\n        setEditingProfile(null);\n      }", "      if (data.success) {\n        router.refresh();\n        setEditingProfile(null);\n      }")

with open('src/app/oficina/OficinaClient.jsx', 'w') as f:
    f.write(content)
print("Patched OficinaClient.jsx")
