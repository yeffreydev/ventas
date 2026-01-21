import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

// MCP Tool Definitions for CRM Operations
// These tools enable the AI to execute real actions in the CRM

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export const CRM_TOOLS: MCPTool[] = [
  {
    name: 'create_customer',
    description: 'Create a new customer in the CRM system. Requires name, email, and identity document information. The customer will be created in the current workspace.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the customer',
        },
        email: {
          type: 'string',
          description: 'Email address of the customer',
        },
        identity_document_type: {
          type: 'string',
          enum: ['DNI', 'RUC', 'CE', 'Passport'],
          description: 'Type of identity document',
        },
        identity_document_number: {
          type: 'string',
          description: 'Identity document number',
        },
        city: {
          type: 'string',
          description: 'City where the customer is located (optional)',
        },
        province: {
          type: 'string',
          description: 'Province where the customer is located (optional)',
        },
        district: {
          type: 'string',
          description: 'District where the customer is located (optional)',
        },
        address: {
          type: 'string',
          description: 'Full address of the customer (optional)',
        },
        stage: {
          type: 'string',
          enum: ['prospect', 'lead', 'customer', 'inactive'],
          description: 'Customer lifecycle stage (default: prospect)',
        },
      },
      required: ['name', 'email', 'identity_document_type', 'identity_document_number'],
    },
  },
  {
    name: 'list_customers',
    description: 'Query and list customers from the CRM. Can filter by stage and limit results. Only shows customers from the current workspace.',
    parameters: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['prospect', 'lead', 'customer', 'inactive'],
          description: 'Filter customers by lifecycle stage (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of customers to return (default: 10, max: 50)',
        },
        search: {
          type: 'string',
          description: 'Search customers by name or email (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_customer_stage',
    description: 'Update the lifecycle stage of a customer. Use this to move customers through the sales funnel.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'UUID of the customer to update',
        },
        new_stage: {
          type: 'string',
          enum: ['prospect', 'lead', 'customer', 'inactive'],
          description: 'New lifecycle stage for the customer',
        },
      },
      required: ['customer_id', 'new_stage'],
    },
  },
  {
    name: 'create_product',
    description: 'Add a new product to the catalog. Requires name, SKU, price, and stock quantity.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Product name',
        },
        sku: {
          type: 'string',
          description: 'Stock Keeping Unit (unique identifier)',
        },
        price: {
          type: 'number',
          description: 'Product price',
        },
        stock: {
          type: 'number',
          description: 'Available stock quantity',
        },
        description: {
          type: 'string',
          description: 'Product description (optional)',
        },
      },
      required: ['name', 'sku', 'price', 'stock'],
    },
  },
  {
    name: 'list_products',
    description: 'Query and list products from the catalog. Can filter by stock status.',
    parameters: {
      type: 'object',
      properties: {
        low_stock_only: {
          type: 'boolean',
          description: 'Show only products with stock below 10 units (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of products to return (default: 10, max: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_product',
    description: 'Update product information including name, price, stock, or description.',
    parameters: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'UUID of the product to update',
        },
        name: {
          type: 'string',
          description: 'Updated product name (optional)',
        },
        price: {
          type: 'number',
          description: 'Updated product price (optional)',
        },
        stock: {
          type: 'number',
          description: 'Updated stock quantity (optional)',
        },
        description: {
          type: 'string',
          description: 'Updated product description (optional)',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'create_order',
    description: 'Create a new order for a customer. Requires customer ID, total amount, and optional items list.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'UUID of the customer placing the order',
        },
        total: {
          type: 'number',
          description: 'Total order amount',
        },
        status: {
          type: 'string',
          enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
          description: 'Order status (default: pending)',
        },
        order_date: {
          type: 'string',
          description: 'Order date in ISO format (optional, defaults to now)',
        },
      },
      required: ['customer_id', 'total'],
    },
  },
  {
    name: 'list_orders',
    description: 'Query and list orders from the CRM. Can filter by status and customer.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
          description: 'Filter orders by status (optional)',
        },
        customer_id: {
          type: 'string',
          description: 'Filter orders by customer UUID (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of orders to return (default: 10, max: 50)',
        },
      },
      required: [],
    },
  },
];

// Helper function to map basic types to SchemaType
function mapTypeToSchemaType(type: string): SchemaType {
  switch (type.toLowerCase()) {
    case 'string': return SchemaType.STRING;
    case 'number': return SchemaType.NUMBER;
    case 'integer': return SchemaType.INTEGER;
    case 'boolean': return SchemaType.BOOLEAN;
    case 'array': return SchemaType.ARRAY;
    case 'object': return SchemaType.OBJECT;
    default: return SchemaType.STRING;
  }
}

// Convert MCP tools to Gemini function declarations
export function getGeminiFunctionDeclarations(): FunctionDeclaration[] {
  return CRM_TOOLS.map(tool => {
    // Convert properties to valid Schema objects
    const properties: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(tool.parameters.properties)) {
      properties[key] = {
        type: mapTypeToSchemaType(value.type),
        description: value.description,
      };
      
      // Add enum if present
      if (value.enum) {
        properties[key].enum = value.enum;
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: properties,
        required: tool.parameters.required,
      },
    };
  });
}
