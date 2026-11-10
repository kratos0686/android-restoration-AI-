import { Project } from '../types';

export interface ClaudeReportResponse {
  engine: string;
  reportMarkdown: string;
  generatedAt: string;
}

export interface VisionFloorplanResponse {
  engine: string;
  room: {
    roomName: string;
    lengthFt: number;
    widthFt: number;
    heightFt: number;
    flooringMaterial: string;
    wallMaterial: string;
    trimMaterial: string;
    wetAreaSqFt: number;
  };
  viewBox: string;
}

export interface ParsedFieldIntentResponse {
  summary: string;
  reading: {
    roomName: string;
    tempF: number;
    rhPercent: number;
    mcPercent: number;
  };
  scopeItem: {
    xactCode: string;
    description: string;
    quantity: number;
    unit: 'SF' | 'LF' | 'EA' | 'DA' | 'HR';
    unitPrice: number;
    iicrcJustification: string;
  };
}

class IntelligenceRouterService {
  /**
   * Calls the Claude 3.7 Sonnet Report Pipeline on the server with automatic fallback to Gemini 3.1 Pro.
   */
  public async generateClaudeReport(project: Project): Promise<ClaudeReportResponse> {
    const res = await fetch('/api/ai/router/generateClaudeReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    if (!res.ok) {
      throw new Error(`Report generation failed with status ${res.status}`);
    }
    return res.json();
  }

  /**
   * Calls the Gemini Multimodal Vision Floor Plan Builder to extract dimensions & classify materials.
   */
  public async buildFloorplanFromImages(params: {
    prompt: string;
    roomName?: string;
    imageBase64?: string;
  }): Promise<VisionFloorplanResponse> {
    const res = await fetch('/api/ai/router/buildFloorplanFromImages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`Floorplan synthesis failed with status ${res.status}`);
    }
    return res.json();
  }

  /**
   * Parses technician voice/text field logs into structured psychrometric readings and Xactimate line items.
   */
  public async parseFieldIntent(transcript: string): Promise<ParsedFieldIntentResponse> {
    const res = await fetch('/api/ai/router/parseFieldIntent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) {
      throw new Error(`Field intent parsing failed with status ${res.status}`);
    }
    return res.json();
  }
}

export const intelligenceRouter = new IntelligenceRouterService();
