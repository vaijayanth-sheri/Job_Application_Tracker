let cachedGemmaModel: string | null = null;

export async function getActiveGemmaModel(apiKey: string): Promise<string> {
  if (cachedGemmaModel) {
    return cachedGemmaModel;
  }

  const defaultGemma = 'gemma-4-31b-it';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = data.models || [];
      const modelNames = models.map((m: any) => m.name);

      if (modelNames.some((name: string) => name.includes('gemma-4-31b-it'))) {
        cachedGemmaModel = 'gemma-4-31b-it';
        return cachedGemmaModel;
      } else if (modelNames.some((name: string) => name.includes('gemma-2-27b-it'))) {
        cachedGemmaModel = 'gemma-2-27b-it';
        return cachedGemmaModel;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch Gemma catalog, falling back to default.", error);
  }

  return defaultGemma;
}

export async function fetchWithFallback(prompt: string, apiKey: string, tools?: any[]) {
  const primaryModel = 'gemini-2.5-flash';
  
  // Helper to execute fetch against a specific model
  const executeFetch = (model: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const bodyPayload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2
      }
    };
    
    if (tools) {
      bodyPayload.tools = tools;
    }

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });
  };

  // 1. Try Primary Model
  let res = await executeFetch(primaryModel);
  
  // 2. Catch target status codes and fallback
  if (!res.ok && [429, 500, 503].includes(res.status)) {
    console.warn(`[FALLBACK LOG] ${primaryModel} failed with code ${res.status}. Routing to backup...`);
    
    // Brief cooldown
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const backupModel = await getActiveGemmaModel(apiKey);
    console.warn(`[FALLBACK LOG] Using backup model: ${backupModel}`);
    
    res = await executeFetch(backupModel);
  }

  // If the fallback fails, or the error was a hard security/auth error (e.g. 401, 403, 400),
  // we return the final response to let the caller handle it.
  return res;
}
