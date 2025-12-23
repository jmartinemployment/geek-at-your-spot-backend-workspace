import Anthropic from '@anthropic-ai/sdk';
import { ConversationStore } from '../storage/ConversationStore';
import { IntentClassifier } from './IntentClassifier';
import { RequirementsExtractor } from '../requirements/RequirementsExtractor';
import { getRequiredFields } from '../requirements/RequirementsSchema';
import { ConversationContext, Message, ConversationPhase } from '../types/conversation';
import { v4 as uuidv4 } from 'uuid';

export interface ChatRequest {
  conversationId?: string;
  message: string;
  userId?: string;
}

export interface ChatResponse {
  conversationId: string;
  response: string;
  phase: ConversationPhase;
  readinessScore?: number;
  requirements?: Record<string, any>;
  escalationReason?: string;
  estimateReady?: boolean;
}

export class ConversationManager {
  private store: ConversationStore;
  private classifier: IntentClassifier;
  private extractor: RequirementsExtractor;
  private anthropic: Anthropic;

  constructor(anthropicApiKey: string) {
    this.store = new ConversationStore();
    this.classifier = new IntentClassifier(anthropicApiKey);
    this.extractor = new RequirementsExtractor(anthropicApiKey);
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });

    setInterval(() => {
      const cleaned = this.store.cleanup();
      if (cleaned > 0) {
        console.log(`[ConversationManager] Cleaned up ${cleaned} old conversations`);
      }
    }, 60 * 60 * 1000);
  }

  async handleMessage(request: ChatRequest): Promise<ChatResponse> {
    let context: ConversationContext;
    let conversationId = request.conversationId;
    let isNewConversation = false;

    if (conversationId && this.store.get(conversationId)) {
      context = this.store.get(conversationId)!;
    } else {
      conversationId = uuidv4();
      context = this.store.create(conversationId);
      isNewConversation = true;
      if (request.userId) {
        context.userId = request.userId;
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: request.message,
      timestamp: new Date()
    };
    this.store.addMessage(conversationId, userMessage);

    if (isNewConversation) {
      const classification = await this.classifier.classifyIntent(request.message, []);
      this.store.updateMetadata(conversationId, {
        problemType: classification.primaryIntent
      });
    }

    const phase = context.metadata.phase;
    let response: ChatResponse;

    switch (phase) {
      case 'gathering':
        response = await this.handleGatheringPhase(conversationId, context);
        break;
      
      case 'confirmation_first':
      case 'confirmation_second':
        response = await this.handleConfirmationResponse(conversationId, context, request.message);
        break;
      
      case 'clarifying':
        response = await this.handleClarifyingPhase(conversationId, context);
        break;
      
      case 'human_escalation':
        response = this.handleHumanEscalation(conversationId, context);
        break;
      
      case 'complete':
        response = this.handleComplete(conversationId, context);
        break;
      
      default:
        response = await this.handleGatheringPhase(conversationId, context);
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: response.response,
      timestamp: new Date()
    };
    this.store.addMessage(conversationId, assistantMessage);

    return response;
  }

  private async handleGatheringPhase(
    conversationId: string,
    context: ConversationContext
  ): Promise<ChatResponse> {
    
    const serviceType = context.metadata.problemType || 'general';
    const extracted = await this.extractor.extract(serviceType, context.messages);
    
    this.store.updateMetadata(conversationId, {
      requirements: extracted.data,
      readinessScore: extracted.readinessScore
    });

    console.log(`[Gathering] Readiness: ${extracted.readinessScore}%, Missing: ${extracted.missingRequired.join(', ')}`);

    if (extracted.completionReady) {
      const confirmationText = await this.generateConfirmationSummary(serviceType, extracted.data);
      this.store.updatePhase(conversationId, 'confirmation_first');
      
      return {
        conversationId,
        response: confirmationText,
        phase: 'confirmation_first',
        readinessScore: extracted.readinessScore,
        requirements: extracted.data
      };
    }

    const nextQuestion = await this.generateNextQuestion(
      serviceType,
      context.messages,
      extracted.data,
      extracted.missingRequired
    );

    return {
      conversationId,
      response: nextQuestion,
      phase: 'gathering',
      readinessScore: extracted.readinessScore
    };
  }

  private async handleConfirmationResponse(
    conversationId: string,
    context: ConversationContext,
    userResponse: string
  ): Promise<ChatResponse> {
    
    const currentPhase = context.metadata.phase;
    const isFirstConfirmation = currentPhase === 'confirmation_first';
    
    const confirmation = await this.analyzeConfirmationResponse(userResponse);

    // PURE AGREEMENT - Ready for estimate!
    if (confirmation.agreed && !confirmation.hasAdditions) {
      this.store.updatePhase(conversationId, 'complete');
      
      return {
        conversationId,
        response: `Perfect! I have everything I need. Let me prepare your project estimate...`,
        phase: 'complete',
        estimateReady: true,
        requirements: context.metadata.requirements
      };
    }

    // USER NEEDS DISCUSSION
    if (confirmation.needsDiscussion) {
      this.store.updatePhase(conversationId, 'human_escalation');
      this.store.updateMetadata(conversationId, {
        escalationReason: 'User needs internal discussion'
      });
      
      return {
        conversationId,
        response: `No problem! Take your time to discuss with your team. When you're ready, just come back and we can finalize the details. I've saved everything we discussed.`,
        phase: 'human_escalation',
        escalationReason: 'User needs internal discussion'
      };
    }

    // ADDING NEW REQUIREMENTS - Go back to gathering
    if (confirmation.hasAdditions) {
      this.store.updatePhase(conversationId, 'gathering');
      
      return {
        conversationId,
        response: `Great! Let me add that to your requirements. ${confirmation.additionDetails}`,
        phase: 'gathering',
        readinessScore: context.metadata.readinessScore
      };
    }

    // CORRECTIONS/DISAGREEMENTS
    if (isFirstConfirmation) {
      // First disagreement - allow clarification
      this.store.updatePhase(conversationId, 'clarifying');
      this.store.incrementConfirmationAttempts(conversationId);
      
      return {
        conversationId,
        response: `Got it, let me clarify. ${confirmation.clarificationNeeded}`,
        phase: 'clarifying',
        readinessScore: context.metadata.readinessScore
      };
    } else {
      // Second disagreement - escalate to human
      this.store.updatePhase(conversationId, 'human_escalation');
      this.store.incrementConfirmationAttempts(conversationId);
      this.store.updateMetadata(conversationId, {
        escalationReason: 'Requirements unclear after 2 confirmation attempts'
      });
      
      return {
        conversationId,
        response: `I want to make sure I understand your needs perfectly. Let me connect you with a team member who can discuss this in detail. They'll reach out within 24 hours to clarify everything and provide an accurate estimate.`,
        phase: 'human_escalation',
        escalationReason: 'Requirements unclear after 2 confirmation attempts'
      };
    }
  }

  private async handleClarifyingPhase(
    conversationId: string,
    context: ConversationContext
  ): Promise<ChatResponse> {
    
    const serviceType = context.metadata.problemType || 'general';
    const extracted = await this.extractor.extract(serviceType, context.messages);
    
    this.store.updateMetadata(conversationId, {
      requirements: extracted.data,
      readinessScore: extracted.readinessScore
    });

    const confirmationText = await this.generateConfirmationSummary(serviceType, extracted.data);
    this.store.updatePhase(conversationId, 'confirmation_second');
    
    return {
      conversationId,
      response: confirmationText,
      phase: 'confirmation_second',
      readinessScore: extracted.readinessScore,
      requirements: extracted.data
    };
  }

  private handleHumanEscalation(
    conversationId: string,
    context: ConversationContext
  ): ChatResponse {
    return {
      conversationId,
      response: `A team member will be in touch shortly. Is there anything else I can help clarify in the meantime?`,
      phase: 'human_escalation',
      escalationReason: context.metadata.escalationReason
    };
  }

  private handleComplete(
    conversationId: string,
    context: ConversationContext
  ): ChatResponse {
    return {
      conversationId,
      response: `Your estimate is ready! Is there anything else you'd like to know about the project?`,
      phase: 'complete',
      estimateReady: true,
      requirements: context.metadata.requirements
    };
  }

  private async generateNextQuestion(
    serviceType: string,
    history: Message[],
    extractedData: Record<string, any>,
    missingFields: string[]
  ): Promise<string> {
    
    const requiredFields = getRequiredFields(serviceType);
    const conversationText = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `You are gathering requirements for a ${serviceType} project.

WHAT WE KNOW:
${JSON.stringify(extractedData, null, 2)}

STILL MISSING (focus on these):
${missingFields.map(f => {
  const field = requiredFields.find(rf => rf.key === f);
  return `- ${f}: ${field?.description || ''}`;
}).join('\n')}

RECENT CONVERSATION:
${conversationText}

YOUR TASK:
Ask ONE natural follow-up question to gather the next most important missing field.
Be conversational and friendly. Don't ask for everything at once.

Respond with just your question:`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    return firstBlock.type === 'text' ? firstBlock.text : 'What else can you tell me about your project?';
  }

  private async generateConfirmationSummary(
    serviceType: string,
    requirements: Record<string, any>
  ): Promise<string> {
    
    const prompt = `Generate a friendly confirmation summary for these ${serviceType} requirements:

${JSON.stringify(requirements, null, 2)}

Create a concise, bullet-point summary that:
1. Starts with "Let me confirm what I've gathered:"
2. Lists 5-8 key points
3. Ends with "Is this accurate?"

Keep it natural and conversational:`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    return firstBlock.type === 'text' ? firstBlock.text : 'Let me confirm what I\'ve gathered. Is this accurate?';
  }

  private async analyzeConfirmationResponse(userResponse: string): Promise<{
    agreed: boolean;
    needsDiscussion: boolean;
    hasAdditions: boolean;
    additionDetails: string;
    clarificationNeeded: string;
  }> {
    
    const prompt = `Analyze this user response to a confirmation question:

USER: "${userResponse}"

Categorize their response:

1. **PURE AGREEMENT**: They agree with everything, no changes
   - Examples: "yes", "correct", "that's right", "looks good", "perfect"

2. **NEEDS DISCUSSION**: They need to talk to someone else before deciding
   - Examples: "need to discuss with partner/boss/team", "let me check with my team"

3. **ADDING REQUIREMENTS**: They agree BUT want to add something NEW
   - Examples: "yes, and also...", "can we add...", "I also need...", "plus..."
   - This is NOT a disagreement, it's expanding scope

4. **CORRECTIONS**: They disagree with what was captured, want to change something
   - Examples: "no, the budget is...", "actually it's...", "you got X wrong"

5. **TRUE DISAGREEMENT**: They fundamentally disagree or it's completely wrong
   - Examples: "no that's all wrong", "I never said that", "not what I meant"

Respond ONLY with JSON:
{
  "agreed": boolean (true for pure agreement),
  "needsDiscussion": boolean,
  "hasAdditions": boolean (true if adding new requirements),
  "additionDetails": "what they want to add, or empty string",
  "clarificationNeeded": "what needs correction, or empty string"
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const firstBlock = response.content[0];
      const text = firstBlock.type === 'text' ? firstBlock.text : '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      return {
        agreed: parsed.agreed || false,
        needsDiscussion: parsed.needsDiscussion || false,
        hasAdditions: parsed.hasAdditions || false,
        additionDetails: parsed.additionDetails || '',
        clarificationNeeded: parsed.clarificationNeeded || ''
      };
    } catch (error) {
      console.error('Failed to parse confirmation analysis:', error);
      return {
        agreed: false,
        needsDiscussion: false,
        hasAdditions: false,
        additionDetails: '',
        clarificationNeeded: userResponse
      };
    }
  }

  getConversation(conversationId: string): ConversationContext | null {
    return this.store.get(conversationId);
  }

  getAllConversations(): ConversationContext[] {
    return this.store.list();
  }
}
