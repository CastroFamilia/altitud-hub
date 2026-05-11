with open('src/app/api/searches/route.js', 'r') as f:
    content = f.read()

content = content.replace("export async function POST(request) {\\n  try {", "export async function POST(request) {\\n  try {\\n    console.log('POST /api/searches called');")

with open('src/app/api/searches/route.js', 'w') as f:
    f.write(content)
