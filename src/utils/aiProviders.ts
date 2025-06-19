import axios from 'axios';
import { AIConfig } from '../store/gameStore';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function makeAIRequest(
  config: AIConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const provider = config.provider || 'openrouter';
  
  switch (provider) {
    case 'openrouter':
      return makeOpenRouterRequest(config, messages);
    case 'lmstudio':
      return makeLMStudioRequest(config, messages);
    case 'ollama':
      return makeOllamaRequest(config, messages);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function makeOpenRouterRequest(
  config: AIConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens
    },
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'GameBoy AI Player'
      }
    }
  );

  return {
    content: response.data.choices[0]?.message?.content || '',
    usage: response.data.usage
  };
}

async function makeLMStudioRequest(
  config: AIConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const baseUrl = config.lmStudioUrl || 'http://localhost:1234';
  
  const response = await axios.post(
    `${baseUrl}/v1/chat/completions`,
    {
      model: config.model || 'local-model',
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    content: response.data.choices[0]?.message?.content || '',
    usage: response.data.usage
  };
}

async function makeOllamaRequest(
  config: AIConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const baseUrl = config.ollamaUrl || 'http://localhost:11434';
  
  // Check if this is a vision request
  const hasImages = messages.some(msg => 
    Array.isArray(msg.content) && 
    msg.content.some(part => part.type === 'image_url')
  );
  
  if (hasImages) {
    // Handle vision requests with Ollama's format
    let prompt = '';
    let images: string[] = [];
    
    messages.forEach(msg => {
      if (Array.isArray(msg.content)) {
        // Extract text and images from vision messages
        const textParts = msg.content.filter(part => part.type === 'text');
        const imageParts = msg.content.filter(part => part.type === 'image_url');
        
        if (textParts.length > 0) {
          prompt += textParts.map(part => part.text).join('\n') + '\n';
        }
        
        // Extract base64 images
        imageParts.forEach(part => {
          if (part.image_url?.url) {
            // Remove data:image/png;base64, prefix if present
            const base64 = part.image_url.url.replace(/^data:image\/[^;]+;base64,/, '');
            images.push(base64);
          }
        });
      } else if (typeof msg.content === 'string') {
        prompt += `${msg.role}: ${msg.content}\n`;
      }
    });
    
    // Use Ollama's vision API format
    const requestBody = {
      model: config.model || 'llava',
      prompt: prompt.trim(),
      images: images, // Array of base64 encoded images
      stream: false,
      options: {
        temperature: config.temperature || 0.7,
        num_predict: config.maxTokens || 1000
      }
    };
    
    console.log('Ollama vision request:', { 
      model: requestBody.model, 
      promptLength: requestBody.prompt.length,
      imageCount: requestBody.images.length,
      baseUrl: `${baseUrl}/api/generate`
    });
    
    const response = await axios.post(
      `${baseUrl}/api/generate`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      content: response.data.response || '',
      usage: {
        prompt_tokens: 0, // Ollama doesn't return token counts
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  } else {
    // Handle text-only requests
    const prompt = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return `${msg.role}: ${msg.content}`;
      } else {
        // Fallback for non-vision content arrays
        const textParts = msg.content.filter(part => part.type === 'text');
        return `${msg.role}: ${textParts.map(part => part.text).join('\n')}`;
      }
    }).join('\n\n');

    const response = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model: config.model || 'llava',
        prompt,
        stream: false,
        options: {
          temperature: config.temperature || 0.7,
          num_predict: config.maxTokens || 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.response || '',
      usage: {
        prompt_tokens: 0, // Ollama doesn't return token counts
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }
}

export function getAvailableModels(config: AIConfig): Promise<Array<{
  id: string;
  name: string;
  description?: string;
}>> {
  const provider = config.provider || 'openrouter';
  
  switch (provider) {
    case 'openrouter':
      return getOpenRouterModels(config);
    case 'lmstudio':
      return getLMStudioModels(config);
    case 'ollama':
      return getOllamaModels(config);
    default:
      return Promise.resolve([]);
  }
}

async function getOpenRouterModels(config: AIConfig) {
  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', { headers });
  const data = await response.json();
  
  return (data.data || []).map((model: any) => ({
    id: model.id,
    name: model.name,
    description: model.description
  }));
}

async function getLMStudioModels(config: AIConfig) {
  const baseUrl = config.lmStudioUrl || 'http://localhost:1234';
  
  try {
    const response = await fetch(`${baseUrl}/v1/models`);
    const data = await response.json();
    
    return (data.data || []).map((model: any) => ({
      id: model.id,
      name: model.id,
      description: 'LM Studio Local Model'
    }));
  } catch (error) {
    return [
      { id: 'local-model', name: 'Local Model', description: 'LM Studio local model' }
    ];
  }
}

async function getOllamaModels(config: AIConfig) {
  const baseUrl = config.ollamaUrl || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    const data = await response.json();
    
    return (data.models || []).map((model: any) => ({
      id: model.name,
      name: model.name,
      description: 'Ollama Local Model'
    }));
  } catch (error) {
    return [
      { id: 'llava', name: 'LLaVA', description: 'Vision-capable model' },
      { id: 'llama2', name: 'Llama 2', description: 'Text-only model' }
    ];
  }
}