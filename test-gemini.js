const { streamText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || '',
  });

  try {
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      prompt: 'Hello! Please reply with a short sentence.',
    });

    console.log("Streaming started:");
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\nDone!");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
