import { StackContext, Api, Queue, Table } from 'sst/constructs';

export function API({ stack }: StackContext) {
  const employeeTable = new Table(stack, 'EmployeeTable', {
    fields: {
      id: 'string',
      employeeId: 'string',
      lastName: 'string',
      phone: 'string',
      firstName: 'string',
    },
    primaryIndex: { partitionKey: 'employeeId', sortKey: 'lastName' },
  });

  const importReportTable = new Table(stack, 'ImportReportTable', {
    fields: {
      id: 'string',
      importId: 'string',
      validEmployeeCount: 'number',
      invalidEmployeeCount: 'number',
      errors: 'string',
      date: 'string',
    },
    primaryIndex: { partitionKey: 'importId', sortKey: 'date' },
  });

  const importQueue = new Queue(stack, 'EmployeeQueue', {
    consumer: {
      function: {
        handler: 'packages/functions/src/employeeQueueHandler.main',
        bind: [employeeTable],
      },
    },
  });

  const reportQueue = new Queue(stack, 'ReportQueue', {
    consumer: {
      function: {
        handler: 'packages/functions/src/storeReport.main',
        bind: [importReportTable],
      },
    },
  });

  const api = new Api(stack, 'EmployeeApi', {
    defaults: {
      function: {
        bind: [importQueue, reportQueue],
        timeout: 240,
      },
    },
    routes: {
      'POST /upload': {
        function: {
          handler: 'packages/functions/src/validateEmployees.main',
          bind: [importQueue, reportQueue],
        },
      },
      'POST /importReport': {
        function: {
          handler: 'packages/functions/src/importReport.main',
          bind: [importReportTable],
        },
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
