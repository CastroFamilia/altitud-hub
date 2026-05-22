const fetch = require('node-fetch');
async function run() {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBgtbqagQqyOulIc_nXnou3iu3f_ABuA9A");
    const json = await res.json();
    console.log(json.models.map(m => m.name).join("\n"));
  } catch(e) {
    console.error(e);
  }
}
run();
