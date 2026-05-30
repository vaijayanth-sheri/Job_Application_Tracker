const http = require('http');

async function test() {
  console.log("Testing localhost:3000/api/ai-workshop");
  try {
    const res = await fetch('http://localhost:3000/api/ai-workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription: "Test Job Description",
        base_cv: "Test base CV",
        cover_letter_guidelines: "none",
        formatting_rules: "none"
      })
    });

    console.log("Status:", res.status);
    console.log("Headers:", res.headers.get('content-type'));

    const text = await res.text();
    console.log("Response Body First 500 chars:");
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error("Failed:", e);
  }
}

test();
