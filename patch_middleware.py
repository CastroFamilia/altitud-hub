with open('src/middleware.js', 'r') as f:
    content = f.read()

content = content.replace("if (isPublic || process.env.NODE_ENV === 'development') {", "if (isPublic) {")

with open('src/middleware.js', 'w') as f:
    f.write(content)
