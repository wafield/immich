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
