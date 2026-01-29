import { createClient } from '@/app/utils/supabase/server';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiFunctionDeclarations } from '@/app/lib/mcp-tools';
import { executeMCPTool } from '@/app/lib/mcp-handler';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';


export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { message, workspaceId, conversationHistory = [] } = body;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'Workspace ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Unauthorized workspace access' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Gemini API key not configured. Please add GOOGLE_GEMINI_API_KEY to your environment variables.' 
        }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch CRM context
    const contextResponse = await fetch(
      `${request.nextUrl.origin}/api/ai/context?workspace_id=${workspaceId}`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    );

    let context = null;
    if (contextResponse.ok) {
      context = await contextResponse.json();
    }

    // Initialize Gemini AI with MCP tools
    const genAI = new GoogleGenerativeAI(apiKey);
    const tools = getGeminiFunctionDeclarations();
    
    // Using gemini-2.0-flash-001 - stable version with better rate limits than 2.5
    // Supports function calling and has 1M tokens context
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      tools: [{ functionDeclarations: tools }],
    });

    // Build system prompt with context
   const systemPrompt = `You are an intelligent AI assistant for a CRM (Customer Relationship Management) system called Botia CRM. Your role is to help users manage their business by answering questions and executing actions.

**Your Capabilities:**
- Answer questions about customers, orders, products, and business metrics
- CREATE new customers, products, and orders using the available tools
- UPDATE customer stages and information
- LIST and query data with filters
- Provide insights and recommendations based on CRM data

**Available Tools:**
You have access to powerful CRM tools that can execute real actions:
- create_customer: Create new customers in the system
- list_customers: Query customers with filters
- update_customer_stage: Move customers through the sales funnel
- create_product: Add products to the catalog
- list_products: Query products with filters
- create_order: Create orders for customers
- list_orders: Query orders with filters

**Current Workspace Context:**
${context ? `
- Total Customers: ${context.stats.totalCustomers}
- Total Orders: ${context.stats.totalOrders}
- Total Products: ${context.stats.totalProducts}

Recent Customers: ${context.recentCustomers.length > 0 ? context.recentCustomers.slice(0, 5).map((c: any) => `${c.name} (${c.email}) - ${c.stage}`).join(', ') : 'None'}

Recent Orders: ${context.recentOrders.length > 0 ? context.recentOrders.slice(0, 5).map((o: any) => `Order #${o.id} - $${o.total} - ${o.status}`).join(', ') : 'None'}

Top Products: ${context.products.length > 0 ? context.products.slice(0, 5).map((p: any) => `${p.name} (${p.sku}) - $${p.price} - Stock: ${p.stock}`).join(', ') : 'None'}
` : 'Context data unavailable'}

**Guidelines:**
- When users ask to CREATE something (customer, product, order), USE THE APPROPRIATE TOOL
- When users ask for information, use list_* tools to query the data
- **CRITICAL**: When a tool returns data (like list_products, list_customers), you MUST show the results to the user
- **NEVER** just say "Acción completada" without showing the data!
- Format lists clearly with bullet points or numbers
- Include key details: names, prices, stock levels, emails, etc.
- Be helpful, professional, and concise
- Always respond in Spanish (the user's language)  
- After executing a tool, explain what you did AND show the complete results
- Format responses using markdown for better readability

**Example - When listing products:**
If list_products returns: { count: 2, products: [{name: "Laptop", price: 1500, stock: 10, sku: "LAP001"}, {name: "Mouse", price: 25, stock: 50, sku: "MOU001"}] }

You should respond:
"Encontré 2 productos en tu catálogo:

1. **Laptop** (SKU: LAP001)
   - Precio: $1,500
   - Stock: 10 unidades

2. **Mouse** (SKU: MOU001)
   - Precio: $25
   - Stock: 50 unidades"`;

    // Build conversation history
    let filteredHistory = conversationHistory;
    const firstUserIndex = conversationHistory.findIndex((msg: any) => msg.role === 'user');
    if (firstUserIndex > 0) {
      filteredHistory = conversationHistory.slice(firstUserIndex);
    }

    const chatHistory = filteredHistory.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const isFirstUserMessage = chatHistory.length === 0 || chatHistory.every((msg: any) => msg.role === 'model');

    // Start chat with history and tools
    const chat = model.startChat({
      history: isFirstUserMessage ? [] : chatHistory,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Send message with system prompt prepended to first message
    const fullMessage = isFirstUserMessage 
      ? `${systemPrompt}\n\nUser: ${message}`
      : message;

    const result = await chat.sendMessage(fullMessage);
    const response = result.response;

    // Check if the model wants to call functions
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      // Execute all function calls
      const functionResponses = [];
      
      for (const call of functionCalls) {
        console.log(`Executing tool: ${call.name}`, call.args);
        
        const toolResult = await executeMCPTool(
          call.name,
          call.args,
          workspaceId,
          user.id
        );

        functionResponses.push({
          name: call.name,
          response: toolResult,
        });
      }

      // Send function responses back to the model
      // Each response must be in the correct format with functionResponse (singular)
      const functionResponseParts = functionResponses.map(fr => ({
        functionResponse: {
          name: fr.name,
          response: fr.response,
        }
      }));

      const result2 = await chat.sendMessage(functionResponseParts);

      const finalResponse = result2.response.text();

      // Return the final response as JSON (not streaming for tool calls)
      return new Response(
        JSON.stringify({ 
          text: finalResponse,
          toolsUsed: functionCalls.map(fc => fc.name),
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // No function calls - stream the regular response
    const encoder = new TextEncoder();
    const responseText = response.text();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: responseText })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in AI chat:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
