export interface GeminiRequestDto {
  prompt?: string;
  text?: string;
  image?: {
    data: string;
    mimeType: string;
  };
  assetId?: string;
}

export interface GeminiResponseDto {
  text: string;
}

/**
 * Individual genAI chat history item (prompt, response) for an asset.
 */
export interface AssetGenAiResponseDto {
  id: string;
  assetId: string;
  prompt: string;
  response: string;
  modelName: string;
  createdAt: string;
  deletedAt: string | null;
}

export async function generateGeminiContent(dto: GeminiRequestDto): Promise<GeminiResponseDto> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch {
      // response is not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getAssetGenAiHistory(assetId: string): Promise<AssetGenAiResponseDto[]> {
  const response = await fetch(`/api/gemini/asset/${assetId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch {
      // response is not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

