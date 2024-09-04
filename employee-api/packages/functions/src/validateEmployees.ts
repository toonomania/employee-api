import { Queue } from 'sst/node/queue';
import {
  SQSClient,
  SendMessageBatchCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { APIGatewayEvent } from 'aws-lambda';
import { chunk } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import * as pako from 'pako';
import { Buffer } from 'buffer';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export type Employee = {
  firstName: string;
  lastName: string;
  phone: string | null;
  employeeId: string;
};

export type EmployeeEvent = {
  employees: Employee[];
};

type Report = {
  importId: string;
  validEmployeeCount: number;
  invalidEmployeeCount: number;
  errors: {
    employeeId: string | null;
    firstNameMissing?: boolean;
    lastNameMissing?: boolean;
    employeeIdMissing?: boolean;
  }[];
};

const sqs = new SQSClient({});
// Function to validate employees and return valid employees with a report for errors
export function validateEmployees(employees: Employee[]): {
  validEmployees: Employee[];
  report: Report;
} {
  const validEmployees: Employee[] = [];
  const errors: Report['errors'] = [];

  employees.forEach((employee) => {
    const error = {
      employeeId: employee.employeeId || null,
      firstNameMissing: !employee.firstName,
      lastNameMissing: !employee.lastName,
      employeeIdMissing: !employee.employeeId,
    };

    if (employee.phone) {
      const phoneNumber = parsePhoneNumberFromString(employee.phone, 'DE');
      if (!phoneNumber || !phoneNumber.isValid()) {
        employee.phone = 'N/A';
      }
    }

    // If any field is missing, it's an error
    if (
      error.firstNameMissing ||
      error.lastNameMissing ||
      error.employeeIdMissing
    ) {
      errors.push(error);
    } else {
      validEmployees.push(employee);
    }
  });

  const report: Report = {
    importId: uuidv4(), // Generate unique import ID
    validEmployeeCount: validEmployees.length,
    invalidEmployeeCount: errors.length,
    errors,
  };

  return { validEmployees, report };
}

function compressMessage(message: any): string {
  const compressed = pako.gzip(JSON.stringify(message)); // Compress the message
  return Buffer.from(compressed).toString('base64'); // Convert to base64 for sending
}

export async function main(event: APIGatewayEvent) {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: 'Missing body',
      };
    }

    const { employees } = JSON.parse(event.body) as EmployeeEvent;

    const { validEmployees, report } = validateEmployees(employees);

    const employeeChunks: Employee[][] = chunk(validEmployees, 10);

    // Process each chunk of valid employees asynchronously
    const sendEmployeeChunksPromises = employeeChunks.map((chunk) => {
      const entries = chunk.map((employee, index) => ({
        Id: `employee-${employee.employeeId}-${index}`,
        MessageBody: compressMessage(employee), // Compress the employee data
      }));

      console.log('Sending employees to SQS:', entries);
      return sqs
        .send(
          new SendMessageBatchCommand({
            Entries: entries,
            QueueUrl: Queue.EmployeeQueue.queueUrl,
          }),
        )
        .catch((error) => {
          console.error('Error sending employee batch to SQS:', error);
        });
    });
    const compressedReport = compressMessage(report);

    await sqs.send(
      new SendMessageCommand({
        MessageBody: compressedReport,
        QueueUrl: Queue.ReportQueue.queueUrl,
      }),
    );

    Promise.all(sendEmployeeChunksPromises)
      .then(async () => {
        console.log('All employees sent successfully');
      })
      .catch((error) => {
        console.error('Error sending employee batches:', error);
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Employees processed successfully',
        importId: report.importId,
      }),
    };
  } catch (error) {
    console.error('Error processing employees', error);
    return {
      statusCode: 500,
      body: `Error processing employees: ${error}`,
    };
  }
}
