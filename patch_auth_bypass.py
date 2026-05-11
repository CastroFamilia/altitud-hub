with open('src/app/api/searches/route.js', 'r') as f:
    content = f.read()

auth_old = """    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }"""

auth_new = """    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    // Mock user for development
    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'; // Mock UUID
"""

content = content.replace(auth_old, auth_new)

insert_old = """    const { data, error } = await supabase.from('buyer_searches').insert({
      agent_id: user.id,"""

insert_new = """    const { data, error } = await supabase.from('buyer_searches').insert({
      agent_id: activeUserId,"""

content = content.replace(insert_old, insert_new)

with open('src/app/api/searches/route.js', 'w') as f:
    f.write(content)
