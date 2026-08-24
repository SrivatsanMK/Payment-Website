import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/dynamoClient';

/**
 * Normalizes an item from DynamoDB to include both `id` and `_id`
 */
export const normalizeDoc = <T = any>(item: any): T => {
  if (!item) return item;
  const doc = { ...item };
  if (doc.id && !doc._id) {
    doc._id = doc.id;
  } else if (doc._id && !doc.id) {
    doc.id = doc._id;
  }
  return doc as T;
};

export const normalizeDocs = <T = any>(items: any[]): T[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeDoc<T>(item));
};

/**
 * Get single item by PK and SK
 */
export const getItem = async <T = any>(pk: string, sk: string): Promise<T | null> => {
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  };
  const result = await docClient.send(new GetCommand(params));
  return result.Item ? normalizeDoc<T>(result.Item) : null;
};

/**
 * Put item into DynamoDB
 */
export const putItem = async <T = any>(item: Record<string, any>): Promise<T> => {
  const params: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: item,
  };
  await docClient.send(new PutCommand(params));
  return normalizeDoc<T>(item);
};

/**
 * Delete item by PK and SK
 */
export const deleteItem = async (pk: string, sk: string): Promise<void> => {
  const params: DeleteCommandInput = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  };
  await docClient.send(new DeleteCommand(params));
};

/**
 * Update item with UpdateExpression
 */
export const updateItem = async <T = any>(
  pk: string,
  sk: string,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>,
  conditionExpression?: string
): Promise<T | null> => {
  const params: UpdateCommandInput = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };
  if (expressionAttributeNames) {
    params.ExpressionAttributeNames = expressionAttributeNames;
  }
  if (conditionExpression) {
    params.ConditionExpression = conditionExpression;
  }

  const result = await docClient.send(new UpdateCommand(params));
  return result.Attributes ? normalizeDoc<T>(result.Attributes) : null;
};

/**
 * Query DynamoDB by Partition Key on Primary Table or GSI
 */
export const queryItems = async <T = any>(params: Omit<QueryCommandInput, 'TableName'>): Promise<T[]> => {
  const queryParams: QueryCommandInput = {
    TableName: TABLE_NAME,
    ...params,
  };

  let allItems: any[] = [];
  let lastEvaluatedKey = undefined;

  do {
    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    const result = await docClient.send(new QueryCommand(queryParams));
    if (result.Items) {
      allItems = allItems.concat(result.Items);
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
    // If limit is specified and we reached it in a single page
    if (params.Limit && allItems.length >= params.Limit) {
      break;
    }
  } while (lastEvaluatedKey && (!params.Limit || allItems.length < params.Limit));

  return normalizeDocs<T>(allItems);
};

/**
 * Scan DynamoDB table with optional FilterExpression
 */
export const scanItems = async <T = any>(params?: Omit<ScanCommandInput, 'TableName'>): Promise<T[]> => {
  const scanParams: ScanCommandInput = {
    TableName: TABLE_NAME,
    ...(params || {}),
  };

  let allItems: any[] = [];
  let lastEvaluatedKey = undefined;

  do {
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    const result = await docClient.send(new ScanCommand(scanParams));
    if (result.Items) {
      allItems = allItems.concat(result.Items);
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
    if (params?.Limit && allItems.length >= params.Limit) {
      break;
    }
  } while (lastEvaluatedKey && (!params?.Limit || allItems.length < params.Limit));

  return normalizeDocs<T>(allItems);
};

/**
 * Batch write items (put and/or delete in chunks of 25)
 */
export const batchWriteItems = async (
  putItems: Record<string, any>[] = [],
  deleteKeys: { PK: string; SK: string }[] = []
): Promise<void> => {
  const writeRequests: any[] = [];

  for (const item of putItems) {
    writeRequests.push({
      PutRequest: {
        Item: item,
      },
    });
  }

  for (const key of deleteKeys) {
    writeRequests.push({
      DeleteRequest: {
        Key: key,
      },
    });
  }

  // DynamoDB BatchWrite limit is 25 items per request
  const CHUNK_SIZE = 25;
  for (let i = 0; i < writeRequests.length; i += CHUNK_SIZE) {
    const chunk = writeRequests.slice(i, i + CHUNK_SIZE);
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk,
      },
    };
    await docClient.send(new BatchWriteCommand(params));
  }
};

/**
 * TransactWrite command for atomic multi-item operations
 */
export const transactWrite = async (transactItems: TransactWriteCommandInput['TransactItems']): Promise<void> => {
  if (!transactItems || transactItems.length === 0) return;
  const params: TransactWriteCommandInput = {
    TransactItems: transactItems,
  };
  await docClient.send(new TransactWriteCommand(params));
};
