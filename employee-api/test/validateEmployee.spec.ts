// validateEmployees.test.ts
import { validateEmployees } from '../packages/functions/src/validateEmployees';

describe('validateEmployees', () => {
  it('should validate employees correctly', () => {
    const employees = [
      {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        employeeId: '1',
      },
      {
        firstName: '',
        lastName: 'Smith',
        phone: '1234567890',
        employeeId: '2',
      },
      { firstName: 'Jane', lastName: '', phone: '1234567890', employeeId: '3' },
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        phone: '1234567890',
        employeeId: '',
      },
    ];

    const { validEmployees, report } = validateEmployees(employees);

    expect(validEmployees).toEqual([
      {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        employeeId: '1',
      },
    ]);
    expect(report).toEqual({
      importId: 'test-uuid',
      validEmployeeCount: 1,
      invalidEmployeeCount: 3,
      errors: [
        {
          employeeId: '2',
          firstNameMissing: true,
          lastNameMissing: false,
          employeeIdMissing: false,
        },
        {
          employeeId: '3',
          firstNameMissing: false,
          lastNameMissing: true,
          employeeIdMissing: false,
        },
        {
          employeeId: null,
          firstNameMissing: false,
          lastNameMissing: false,
          employeeIdMissing: true,
        },
      ],
    });
  });
});
