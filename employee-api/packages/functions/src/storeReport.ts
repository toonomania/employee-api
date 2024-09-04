import { SQSEvent } from 'aws-lambda';
import { Table } from 'sst/node/table';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as pako from 'pako';
import { Buffer } from 'buffer';

const dynamoDB = new DynamoDBClient({});
const tableName = Table.ImportReportTable.tableName;

function decompressMessage(compressedMessage: string): any {
  const buffer = Buffer.from(compressedMessage, 'base64');
  const decompressed = pako.ungzip(buffer, { to: 'string' });
  return JSON.parse(decompressed);
}

export async function main(event: SQSEvent) {
  try {
    for (const record of event.Records) {
      const report = decompressMessage(record.body);

      const params = {
        TableName: tableName!,
        Item: {
          id: { S: `${uuidv4()}` },
          importId: { S: report.importId },
          validEmployeeCount: { N: report.validEmployeeCount.toString() },
          invalidEmployeeCount: { N: report.invalidEmployeeCount.toString() },
          errors: { S: JSON.stringify(report.errors) },
          date: { S: new Date().toDateString() },
          status: { S: report.status },
        },
      };

      await dynamoDB.send(new PutItemCommand(params));
    }

    return { statusCode: 200, body: 'Success' };
  } catch (error) {
    console.error('Error processing report:', error);
    throw error;
  }
}
