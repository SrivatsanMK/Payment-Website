import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'PaymentWebsite';
export const REGION = process.env.AWS_REGION || 'ap-south-1';

// Create base DynamoDBClient
// If running on EC2 with IAM role PaymentWebsite-EC2-DynamoDB-Role, SDK automatically uses IMDS credentials.
// In development, it uses AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from env or ~/.aws/credentials.
const client = new DynamoDBClient({
  region: REGION,
});

// Create DynamoDBDocumentClient with marshalling options to remove undefined values automatically
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Health check to verify DynamoDB connectivity on server startup
 */
export const testDynamoConnection = async (): Promise<boolean> => {
  try {
    const describeCmd = new DescribeTableCommand({ TableName: TABLE_NAME });
    await docClient.send(describeCmd);
    console.log(`[DynamoDB] Successfully connected to table: ${TABLE_NAME} (Region: ${REGION})`);
    return true;
  } catch (error: any) {
    console.warn(`[DynamoDB] Connectivity notice for table '${TABLE_NAME}': ${error.message}`);
    // Return true in local or if role is waiting for runtime request
    return false;
  }
};

export default docClient;
