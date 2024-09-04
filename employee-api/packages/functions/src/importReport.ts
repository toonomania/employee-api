import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Table } from "sst/node/table";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamoDB = new DynamoDBClient({});

const tableName = Table.ImportReportTable.tableName;

export async function main(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is missing" }),
      };
    }

    const { importId } = JSON.parse(event.body);

    if (!importId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "importId is required" }),
      };
    }

    const params = {
      TableName: tableName!,
      Key: {
        importId: { S: importId },
      },
    };

    const result = await dynamoDB.send(new GetItemCommand(params));

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `Report with importId ${importId} not found`,
        }),
      };
    }

    const report = unmarshall(result.Item);

    return {
      statusCode: 200,
      body: JSON.stringify(report),
    };
  } catch (error) {
    console.error("Error fetching report:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error fetching report", error: error }),
    };
  }
}
