import { SQSEvent } from 'aws-lambda';
import { Table } from 'sst/node/table';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as pako from 'pako';
import { Buffer } from 'buffer';

const dynamoDB = new DynamoDBClient({});
const tableName = Table.EmployeeTable.tableName;

function decompressMessage(compressedMessage: string): any {
  const buffer = Buffer.from(compressedMessage, 'base64');
  const decompressed = pako.ungzip(buffer, { to: 'string' });
  return JSON.parse(decompressed);
}

export async function main(event: SQSEvent) {
  try {
    for (const record of event.Records) {
      const employee = decompressMessage(record.body);

      const params = {
        TableName: tableName!,
        Item: {
          id: { S: `${uuidv4()}` },
          firstName: { S: employee.firstName },
          lastName: { S: employee.lastName },
          employeeId: { S: employee.employeeId },
          phone: { S: employee.phone || 'N/A' },
        },
      };

      await dynamoDB.send(new PutItemCommand(params));
    }

    return { statusCode: 200, body: 'Success' };
  } catch (error) {
    console.error('Error storing employee data:', error);
    throw error;
  }
}
