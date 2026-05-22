import re

with open('_bmad-output/planning-artifacts/epics.md', 'r') as f:
    content = f.read()

# 1. Extract Epic 1 and 2
epic1_2_pattern = re.compile(r'(## Epic 1: Infrastructure Migration.*?)(?=## Epic 3: Complete Internationalization)', re.DOTALL)
match = epic1_2_pattern.search(content)

if match:
    epic1_2_text = match.group(1)
    
    # 2. Remove them from the top and add Phase 1 header
    content = content.replace(epic1_2_text, '## Phase 1: Feature Development (Local/Supabase)\n\n')
    
    # 3. Add Phase 2 and 3 headers and place Epic 1 & 2 at the bottom
    # We will split at Epic 13 to insert Phase 2 before it.
    epic13_pattern = re.compile(r'(## Epic 13: Bi-Directional Property Syndication.*?)$', re.DOTALL)
    match13 = epic13_pattern.search(content)
    if match13:
        epic13_text = match13.group(1)
        phase2_text = '## Phase 2: Production Coolify Migration\n\n' + epic1_2_text + '\n## Phase 3: Future Enhancements\n\n' + epic13_text
        content = content.replace(epic13_text, phase2_text)
    else:
        # If Epic 13 not found, just append to end
        content += '\n\n## Phase 2: Production Coolify Migration\n\n' + epic1_2_text
        
    with open('_bmad-output/planning-artifacts/epics.md', 'w') as f:
        f.write(content)
    print("Successfully rearranged epics.md")
else:
    print("Could not find Epic 1 & 2")

