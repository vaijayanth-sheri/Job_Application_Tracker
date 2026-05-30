const http = require('http');

async function test() {
  console.log("Testing API endpoint...");
  try {
    const res = await fetch('http://localhost:3000/api/ai-workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "This is a test job description",
        jobDescription: "This is a test job description",
        base_cv: "Test CV",
        cover_letter_guidelines: "Test guidelines",
        formatting_rules: "Test rules"
      })
    });
    
    console.log("Status:", res.status);
    
    if (!res.ok) {
      console.log("Error body:", await res.text());
      return;
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log("CHUNK:", decoder.decode(value));
    }
    console.log("DONE!");
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
