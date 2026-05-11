with open('src/app/api/searches/route.js', 'r') as f:
    content = f.read()

auth_old = """    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }"""

auth_new = """    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }"""

content = content.replace(auth_old, auth_new)

with open('src/app/api/searches/route.js', 'w') as f:
    f.write(content)
